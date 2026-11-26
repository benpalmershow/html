#!/usr/bin/env python3
"""
Fetch the Manheim Used Vehicle Value Index (MUVVI) full-month reading and
update the "used-vehicle-value-index" indicator (agency == "Manheim") in
json/financials-data.json.

Source: Cox Automotive's monthly "Manheim Used Vehicle Value Index: <Month>
<Year> Trends" insights article, which publishes the official full-month index
on the fifth business day of the following month. The article is public and
requires no API key. The full-month value is parsed from the sentence
"MUVVI) in <Month> was <value>".

Only the current calendar year's nested year object is written, matching the
convention used by scripts/fetch_adp.py. Prior-month values are overwritten
with the latest (revised) figures.

Usage:
  python3 scripts/fetch_manheim.py            # fetch and update the JSON
  python3 scripts/fetch_manheim.py --dry-run  # preview changes without writing
"""
from fetch_utils import atomic_write_json
import argparse
import json
import logging
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

try:
    import requests
except ImportError:
    print("requests is required. Install with: pip install requests")
    sys.exit(1)

from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

ROOT = Path(__file__).resolve().parent.parent
FINANCIALS_PATH = ROOT / "json" / "financials-data.json"

INSIGHTS_URL_TEMPLATE = (
    "https://www.coxautoinc.com/insights/"
    "manheim-used-vehicle-value-index-{month}-{year}-trends/"
)

MONTHS = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
]

# Matches e.g. "MUVVI) in October was 206.8" (full-month official reading).
VALUE_RE = re.compile(
    r"MUVVI\)\s+in\s+([A-Za-z]+)\s+was\s+(\d+(?:\.\d+)?)", re.IGNORECASE
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def previous_month(now):
    """Return (month_name, year) for the month before ``now``."""
    first_of_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_day_prev = first_of_this_month.replace(day=1) - timedelta(days=1)
    return MONTHS[last_day_prev.month - 1], last_day_prev.year


@retry(retry=retry_if_exception_type(requests.RequestException), stop=stop_after_attempt(4),
       wait=wait_exponential(multiplier=2, min=3, max=30))
def fetch_article(url):
    resp = requests.get(url, headers={"User-Agent": "howdy-stranger/1.0"}, timeout=30)
    if resp.status_code == 404:
        # Article for the target month is not published yet (release is the
        # fifth business day of the following month). Treat as "nothing to do".
        return None
    resp.raise_for_status()
    return resp.text


def parse_full_month(html):
    """Return (month_name, value_str) from the article HTML, or (None, None)."""
    match = VALUE_RE.search(html)
    if not match:
        return None, None
    month = match.group(1).lower()
    value = match.group(2)
    return month, value


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    now = datetime.now(timezone.utc)
    current_year = str(now.year)

    month_name, year = previous_month(now)
    url = INSIGHTS_URL_TEMPLATE.format(month=month_name, year=year)
    logger.info("Fetching %s", url)

    try:
        html = fetch_article(url)
    except requests.RequestException as e:
        logger.error("Could not fetch Manheim article %s: %s", url, e)
        sys.exit(1)

    if html is None:
        logger.info("Manheim article for %s %s not published yet; nothing to do", month_name, year)
        return

    data_month, value = parse_full_month(html)
    if not data_month:
        logger.error("Could not parse full-month MUVVI value from %s", url)
        sys.exit(1)

    # Trust the month parsed from the article, falling back to the URL month.
    if data_month not in MONTHS:
        data_month = month_name
    data_year = current_year if year == now.year else str(year)

    logger.info("Parsed %s %s = %s", data_year, data_month, value)

    data = json.loads(FINANCIALS_PATH.read_text())
    indicator = None
    for idx in data.get("indices", []):
        if idx.get("id") == "used-vehicle-value-index" and idx.get("agency") == "Manheim":
            indicator = idx
            break
    if indicator is None:
        logger.error("used-vehicle-value-index (Manheim) indicator not found")
        sys.exit(1)

    year_obj = indicator.setdefault(data_year, {})
    changed = False
    if year_obj.get(data_month) != value:
        year_obj[data_month] = value
        changed = True
        indicator["newMonth"] = True
        logger.info("Set %s %s = %s", data_year, data_month, value)
    else:
        indicator["newMonth"] = False

    if args.dry_run:
        print(json.dumps({data_year: {data_month: value}}, indent=2))
        return

    if not changed:
        logger.info("No Manheim data changes; skipping write")
        return

    indicator["lastUpdated"] = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    indicator["releaseTimeISO"] = now.replace(microsecond=0).isoformat().replace("+00:00", "Z")
    atomic_write_json(FINANCIALS_PATH, data)
    logger.info("Updated %s", FINANCIALS_PATH)


if __name__ == "__main__":
    main()