#!/usr/bin/env python3
"""
Fetch same-day-release housing sentiment indicators and update
json/financials-data.json:

  - pending-home-sales-index (agency == "NAR")  -> NAR Pending Home Sales Snapshot
  - housing-market-index     (agency == "NAHB") -> NAHB/Wells Fargo HMI page

Both sources are public, require no API key, and are published on release day
(so no delayed-release lag). Each page exposes the latest month's reading in
plain text, parsed here:

  NAR : "... in <Month> <Year> to an index of <value>"
  NAHB: "HMI Key Findings: <Month> <Year>" + "... to <value> in <Month>"

Only the parsed month is written into its "YYYY" bucket. Re-fetches are
idempotent (no change -> no write) and set newMonth only when a brand-new
month is added.

Usage:
  python3 scripts/fetch_housing_sentiment.py            # fetch and update JSON
  python3 scripts/fetch_housing_sentiment.py --dry-run  # preview, no write
"""
from fetch_utils import atomic_write_json, http_get_text
import argparse
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

ROOT = Path(__file__).resolve().parent.parent
FINANCIALS_PATH = ROOT / "json" / "financials-data.json"

NAR_PHSI_URL = "https://www.nar.realtor/infographics/pending-home-sales-snapshot"
NAHB_HMI_URL = "https://www.nahb.org/news-and-economics/housing-economics/indices/housing-market-index"

MONTHS = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
]

# "... in October 2026 to an index of 63.0"
NAR_RE = re.compile(r"in\s+([A-Za-z]+)\s+(\d{4})\s+to\s+an\s+index\s+of\s+(\d+(?:\.\d+)?)", re.IGNORECASE)
# "HMI Key Findings: November 2026"
NAHB_MONTH_RE = re.compile(r"HMI\s+Key\s+Findings:\s*([A-Za-z]+)\s+(\d{4})", re.IGNORECASE)
# "... fell four points to 25 in November."
NAHB_VALUE_RE = re.compile(r"to\s+(\d{1,3})\s+in\s+([A-Za-z]+)", re.IGNORECASE)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def fetch_text(url):
    return http_get_text(url)


def parse_nar(html):
    """Return (month_name, year, value_str) for the NAR PHSI snapshot."""
    m = NAR_RE.search(html)
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

    targets = [
        ("pending-home-sales-index", "NAR", NAR_PHSI_URL, parse_nar),
        ("housing-market-index", "NAHB", NAHB_HMI_URL, parse_nahb),
    ]

    updates = []
    for indicator_id, agency, url, parser_fn in targets:
        indicator = find_indicator(data, indicator_id, agency)
        if indicator is None:
            logger.error("%s (%s) indicator not found; skipping", indicator_id, agency)
            continue
        try:
            html = fetch_text(url)
        except requests.RequestException as e:
            logger.error("Could not fetch %s: %s", url, e)
            continue
        parsed = parser_fn(html)
        if not parsed:
            logger.error("Could not parse %s from %s", indicator_id, url)
            continue
        month, year, value = parsed
        logger.info("%s: %s %s = %s", indicator_id, year, month, value)
        if apply_value(indicator, month, year, value):
            indicator["lastUpdated"] = now_iso
            indicator["releaseTimeISO"] = now.replace(microsecond=0).isoformat().replace("+00:00", "Z")
            updates.append(f"{indicator_id}: {year} {month} = {value}")

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