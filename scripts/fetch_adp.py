#!/usr/bin/env python3
"""
Fetch ADP Private Employment (Total Nonfarm Private Payroll Employment) from
FRED (series ADPMNUSNERSA, seasonally adjusted, monthly) and update the
"private-employment" indicator (agency == "ADP") in json/financials-data.json.

FRED serves the series as a public CSV with no API key required:
  https://fred.stlouisfed.org/graph/fredgraph.csv?id=ADPMNUSNERSA

Only the current calendar year's nested year object is written. Flat top-level
month fields hold prior-year data and are left untouched, so charts never
double-plot a month. Prior-month values are overwritten with the latest
(revised) figures.

Usage:
  python3 scripts/fetch_adp.py            # fetch and update the JSON
  python3 scripts/fetch_adp.py --dry-run  # preview changes without writing
"""
from fetch_utils import atomic_write_json
import argparse
import csv
import io
import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import requests
except ImportError:
    print("requests is required. Install with: pip install requests")
    sys.exit(1)

from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

ROOT = Path(__file__).resolve().parent.parent
FINANCIALS_PATH = ROOT / "json" / "financials-data.json"
CSV_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=ADPMNUSNERSA"

MONTH_MAP = {
    "01": "january", "02": "february", "03": "march", "04": "april",
    "05": "may", "06": "june", "07": "july", "08": "august",
    "09": "september", "10": "october", "11": "november", "12": "december",
}

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@retry(retry=retry_if_exception_type(requests.RequestException), stop=stop_after_attempt(4),
       wait=wait_exponential(multiplier=2, min=3, max=30))
def fetch_csv():
    resp = requests.get(CSV_URL, timeout=30)
    resp.raise_for_status()
    return resp.text


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    text = fetch_csv()
    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)

    now = datetime.now(timezone.utc)
    current_year = str(now.year)

    # Collect latest value per month for the current year.
    updates = {}
    for r in rows:
        date_str = r.get("observation_date") or r.get("DATE") or r.get("date")
        val = r.get("ADPMNUSNERSA") or r.get("value")
        if not date_str or val in (None, "", "."):
            continue
        y, m = date_str.split("-")[:2]
        if y != current_year:
            continue
        # FRED reports persons; format with thousands separators.
        try:
            n = int(float(val))
        except ValueError:
            continue
        updates[MONTH_MAP[m]] = f"{n:,}"

    if not updates:
        logger.error("No %s ADP data found", current_year)
        sys.exit(1)

    data = json.loads(FINANCIALS_PATH.read_text())
    indicator = None
    for idx in data.get("indices", []):
        if idx.get("id") == "private-employment" and idx.get("agency") == "ADP":
            indicator = idx
            break
    if indicator is None:
        logger.error("private-employment (ADP) indicator not found")
        sys.exit(1)

    year_obj = indicator.setdefault(current_year, {})
    changed = False
    for month, value in updates.items():
        if year_obj.get(month) != value:
            year_obj[month] = value
            changed = True
            logger.info("Set %s %s = %s", current_year, month, value)

    if args.dry_run:
        print(json.dumps({current_year: updates}, indent=2))
        return

    if not changed:
        logger.info("No ADP data changes; skipping write")
        return

    indicator["lastUpdated"] = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    iso = now.replace(microsecond=0).isoformat().replace("+00:00", "Z")
    indicator["releaseTimeISO"] = iso
    atomic_write_json(FINANCIALS_PATH, data)
    logger.info("Updated %s", FINANCIALS_PATH)


if __name__ == "__main__":
    main()