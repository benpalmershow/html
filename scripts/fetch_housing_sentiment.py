#!/usr/bin/env python3
"""
Fetch same-day-release housing sentiment indicators and update
json/financials-data.json:

  - pending-home-sales-index (agency == "NAR")  -> NAR PHSI PDF (full table with revisions)
  - housing-market-index     (agency == "NAHB") -> NAHB/Wells Fargo HMI page

The NAR PHSI PDF contains the full historical table with revision markers:
  - "r" = revised (previous month's preliminary value was updated)
  - "p" = preliminary (current month's initial release)

This fetcher parses the entire table to catch revisions, not just the latest month.

Usage:
  python3 scripts/fetch_housing_sentiment.py            # fetch and update JSON
  python3 scripts/fetch_housing_sentiment.py --dry-run  # preview, no write
"""
from fetch_utils import atomic_write_json, http_get
import argparse
import io
import json
import logging
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import requests
except ImportError:
    print("requests is required. Install with: pip install requests")
    sys.exit(1)

try:
    import pdfplumber
except ImportError:
    pdfplumber = None

ROOT = Path(__file__).resolve().parent.parent
FINANCIALS_PATH = ROOT / "json" / "financials-data.json"

NAR_PHSI_PAGE = "https://www.nar.realtor/research-and-statistics/housing-statistics/pending-home-sales"
NAHB_HMI_URL = "https://www.nahb.org/news-and-economics/housing-economics/indices/housing-market-index"

MONTHS = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
]
MONTH_TO_NUM = {m: i+1 for i, m in enumerate(MONTHS)}

# PDF table row pattern: "2026 Sept r 66.1 ..." or "2026 Jan 70.8 ..."
# Matches: year, month, optional_revision_marker, value
PDF_ROW_RE = re.compile(
    r"^\s*(\d{4})\s+([A-Za-z]{3,9})\s+(?:([rp])\s+)?(\d+(?:\.\d+)?)",
    re.IGNORECASE
)

# "... in October 2026 to an index of 63.0" (infographic fallback)
NAR_INF_RE = re.compile(
    r"in\s+([A-Za-z]+)\s+(\d{4})\s+to\s+an\s+index\s+of\s+(\d+(?:\.\d+)?)",
    re.IGNORECASE
)

# "HMI Key Findings: November 2026"
NAHB_MONTH_RE = re.compile(
    r"HMI\s+Key\s+Findings:\s*([A-Za-z]+)\s+(\d{4})",
    re.IGNORECASE
)
# "... fell four points to 25 in November."
NAHB_VALUE_RE = re.compile(
    r"to\s+(\d{1,3})\s+in\s+([A-Za-z]+)",
    re.IGNORECASE
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def fetch_text(url):
    return http_get(url).text


def find_latest_pdf_url(html):
    """Extract the latest PHSI PDF URL from the NAR page."""
    # NAR page returns heavily escaped HTML with JSON-style Unicode escapes (\u003c, \u003e, etc.)
    # Decode Unicode escapes first
    html = html.encode().decode('unicode_escape')
    # Then unescape HTML entities
    import html as html_module
    html = html_module.unescape(html)
    # Pattern: /sites/default/files/2026-11/phs-10-2026-pending-home-sales-11-18-2026.pdf
    pdf_links = re.findall(
        r'href=["\']?(/sites/default/files/\d{4}-\d{2}/phs-\d{2}-\d{4}-pending-home-sales-\d{2}-\d{2}-\d{4}\.pdf)["\']?',
        html
    )
    if not pdf_links:
        return None
    # Return the first (latest) link as absolute URL
    return "https://www.nar.realtor" + pdf_links[0]


def parse_nar_pdf(pdf_url):
    """Parse the NAR PHSI PDF and return list of (month, year, value, is_revised)."""
    if pdfplumber is None:
        logger.warning("pdfplumber not installed; skipping PDF parse")
        return []

    try:
        resp = http_get(pdf_url)
        if resp.status_code == 404:
            logger.warning("PDF not found: %s", pdf_url)
            return []
        pdf_bytes = resp.content
    except requests.RequestException as e:
        logger.error("Could not fetch PDF %s: %s", pdf_url, e)
        return []

    results = []
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if not text:
                    continue
                for line in text.split("\n"):
                    line = line.strip()
                    if not line:
                        continue
                    m = PDF_ROW_RE.match(line)
                    if not m:
                        continue
                    year = int(m.group(1))
                    month_name = m.group(2).lower()
                    rev_marker = (m.group(3) or "").lower()
                    value = m.group(4)

                    # Normalize month name (PDF uses abbreviated: Sept, Oct, etc.)
                    month = None
                    for m_name in MONTHS:
                        if m_name.startswith(month_name[:3]):
                            month = m_name
                            break
                    if not month:
                        continue

                    is_revised = rev_marker == "r"
                    results.append((month, year, value, is_revised))
    except Exception as e:
        logger.error("Error parsing PDF: %s", e)
        return []

    return results


def parse_nar_infographic(html):
    """Fallback: parse the infographic page for latest month only."""
    m = NAR_INF_RE.search(html)
    if not m:
        return None
    month = m.group(1).lower()
    if month not in MONTHS:
        return None
    return month, int(m.group(2)), m.group(3)


def parse_nahb(html):
    """Return (month_name, year, value_str) for the NAHB HMI page."""
    mm = NAHB_MONTH_RE.search(html)
    if not mm:
        return None
    month = mm.group(1).lower()
    year = int(mm.group(2))
    if month not in MONTHS:
        return None
    vm = NAHB_VALUE_RE.search(html)
    if not vm or vm.group(2).lower() != month:
        return None
    return month, year, vm.group(1)


def find_indicator(data, indicator_id, agency):
    for idx in data.get("indices", []):
        if idx.get("id") == indicator_id and idx.get("agency") == agency:
            return idx
    return None


def apply_value(indicator, month, year, value):
    """Write value into the indicator's year bucket. Returns True if changed."""
    year_key = str(year)
    bucket = indicator.setdefault(year_key, {})
    if bucket.get(month) == value:
        indicator["newMonth"] = False
        return False
    is_new_month = month not in bucket
    bucket[month] = value
    indicator["newMonth"] = is_new_month
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    data = json.loads(FINANCIALS_PATH.read_text())
    now = datetime.now(timezone.utc)
    now_iso = now.strftime("%Y-%m-%dT%H:%M:%SZ")

    updates = []

    # --- NAR Pending Home Sales Index (via PDF for full revision history) ---
    indicator = find_indicator(data, "pending-home-sales-index", "NAR")
    if indicator:
        try:
            html = fetch_text(NAR_PHSI_PAGE)
        except requests.RequestException as e:
            logger.error("Could not fetch NAR page: %s", e)
            html = ""

        pdf_url = find_latest_pdf_url(html) if html else None
        parsed_all = []

        if pdf_url:
            logger.info("Fetching NAR PHSI PDF: %s", pdf_url)
            parsed_all = parse_nar_pdf(pdf_url)

        if not parsed_all:
            # Fallback to infographic page (latest month only)
            logger.info("Falling back to infographic page")
            parsed = parse_nar_infographic(html)
            if parsed:
                month, year, value = parsed
                parsed_all = [(month, year, value, False)]

        for month, year, value, is_revised in parsed_all:
            logger.info("NAR PHSI: %s %s = %s (revised=%s)", year, month, value, is_revised)
            if apply_value(indicator, month, year, value):
                indicator["lastUpdated"] = now_iso
                indicator["releaseTimeISO"] = now.replace(microsecond=0).isoformat().replace("+00:00", "Z")
                updates.append(f"pending-home-sales-index: {year} {month} = {value} (revised={is_revised})")

    # --- NAHB Housing Market Index ---
    indicator = find_indicator(data, "housing-market-index", "NAHB")
    if indicator:
        try:
            html = fetch_text(NAHB_HMI_URL)
        except requests.RequestException as e:
            logger.error("Could not fetch NAHB page: %s", e)
            html = ""

        parsed = parse_nahb(html)
        if parsed:
            month, year, value = parsed
            logger.info("NAHB HMI: %s %s = %s", year, month, value)
            if apply_value(indicator, month, year, value):
                indicator["lastUpdated"] = now_iso
                indicator["releaseTimeISO"] = now.replace(microsecond=0).isoformat().replace("+00:00", "Z")
                updates.append(f"housing-market-index: {year} {month} = {value}")

    if args.dry_run:
        print(json.dumps(updates, indent=2))
        return

    if not updates:
        logger.info("No housing sentiment changes; skipping write")
        return

    data["lastUpdated"] = now_iso
    atomic_write_json(FINANCIALS_PATH, data)
    logger.info("Updated %s (%d changes)", FINANCIALS_PATH, len(updates))


if __name__ == "__main__":
    main()