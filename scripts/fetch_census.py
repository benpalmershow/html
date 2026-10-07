#!/usr/bin/env python3
"""
Fetch U.S. Census Bureau indicators from the Census API and update the
Census-sourced indicators in json/financials-data.json.

API (requires a free key):
  Base: https://api.census.gov/data
  Docs: https://api.census.gov/data.html
  Key:  https://api.census.gov/data/key_signup.html

Indicators updated (agency == "Census"):
  trade-deficit   timeseries/eits/ftd (FT-900, goods and services,
                  seasonally adjusted): BAL -> deficit (stored positive),
                  IMP -> imports, EXP -> exports

Only the current calendar year's nested year object (e.g. "2026": {"january": ...})
is written for the indicator and its imports/exports sub-objects. Flat top-level
month fields hold prior-year data and are left untouched, so charts never
double-plot a month.

Usage:
  python3 scripts/fetch_census.py            # fetch and update the JSON
  python3 scripts/fetch_census.py --dry-run  # preview changes without writing
"""

import argparse
import json
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import requests
except ImportError:
    print("requests is required. Install with: pip install requests")
    sys.exit(1)

from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

load_dotenv()

BASE_URL = "https://api.census.gov/data"
ROOT = Path(__file__).resolve().parent.parent
FINANCIALS_PATH = ROOT / "json" / "financials-data.json"

API_KEY = os.environ.get("CENSUS_API_KEY")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

MONTH_MAP = {
    "01": "january", "02": "february", "03": "march", "04": "april",
    "05": "may", "06": "june", "07": "july", "08": "august",
    "09": "september", "10": "october", "11": "november", "12": "december",
}

# FT-900 (timeseries/eits/ftd) dimensions:
# category_code BOPGS = goods and services (the headline trade balance),
# seasonally_adj "yes" = seasonally adjusted, time_slot_id "0" = monthly.
FT900_CATEGORY = "BOPGS"
FT900_SEASONAL = "yes"
FT900_MONTHLY_SLOT = "0"

# data_type_code -> field written on the indicator.
FT900_FIELDS = {"BAL": "deficit", "EXP": "exports", "IMP": "imports"}

# Indicator id -> fetched updates. None is the indicator's own month fields.
INDICATOR_IDS = ("trade-deficit",)

if not API_KEY:
    print("Error: CENSUS_API_KEY environment variable not set.")
    print("Get a free key at https://api.census.gov/data/key_signup.html")
    sys.exit(1)


@retry(
    retry=retry_if_exception_type(requests.RequestException),
    stop=stop_after_attempt(4),
    wait=wait_exponential(multiplier=2, min=3, max=30),
)
def fetch_census_data(dataset, params):
    """Fetch the data rows from a Census API dataset.

    Returns a list of dicts keyed by the header row. The API
    auto-appends the `time` and `us` key columns to every row.
    """
    resp = requests.get(f"{BASE_URL}/{dataset}", params=params, timeout=30)
    if resp.status_code == 429:
        raise requests.RequestException("Rate limited (429)")
    resp.raise_for_status()
    payload = resp.json()
    if not payload:
        return []
    header = payload[0]
    return [dict(zip(header, row)) for row in payload[1:]]


def fetch_ft900(target_year):
    """Goods-and-services trade rows for each released month of target_year.

    Returns {month_key: {"deficit": int, "exports": int, "imports": int}}
    with values in millions of dollars. The deficit is stored positive.
    The still-open month is skipped.
    """
    rows = fetch_census_data(
        "timeseries/eits/ftd",
        {
            "get": "time_slot_id,seasonally_adj,data_type_code,category_code,cell_value,error_data",
            "for": "us:*",
            "time": str(target_year),
            "key": API_KEY,
        },
    )

    now = datetime.now(timezone.utc)
    out = {}
    for row in rows:
        if row.get("category_code") != FT900_CATEGORY:
            continue
        if row.get("seasonally_adj") != FT900_SEASONAL:
            continue
        if row.get("time_slot_id") != FT900_MONTHLY_SLOT:
            continue
        # error_data is "yes"/"no", not a boolean.
        if str(row.get("error_data", "")).lower() == "yes":
            continue
        try:
            year, month_num = row["time"].split("-")
            amount = int(float(row["cell_value"]))
        except (ValueError, TypeError, KeyError):
            continue
        if int(year) != target_year:
            continue
        month_key = MONTH_MAP.get(month_num)
        if not month_key:
            continue
        # Skip the still-open month: a month only counts once it has
        # fully elapsed, otherwise we would store a partial value.
        if (int(year), int(month_num)) >= (now.year, now.month):
            continue
        field = FT900_FIELDS.get(row.get("data_type_code"))
        if not field:
            continue
        # The API balance is negative for a deficit; the JSON stores
        # the deficit as a positive number.
        if field == "deficit":
            amount = -amount
        out.setdefault(month_key, {})[field] = amount
    return out


def format_millions(value):
    return f"${value:,.0f}B"


def write_month_values(indicator, year_key, updates, now_iso, changes):
    """Write formatted month values onto an indicator.

    updates maps a field name (None for the indicator's own month fields)
    to {month_key: formatted_value}.
    """
    for field, values in updates.items():
        target = indicator if field is None else indicator.setdefault(field, {})
        if year_key not in target:
            target[year_key] = {}
        for month_key, formatted in values.items():
            existing = target[year_key].get(month_key)
            if existing != formatted:
                target[year_key][month_key] = formatted
                label = f"{field}.{month_key}" if field else month_key
                changes.append(
                    f"{indicator.get('name')} ({year_key} {label}): "
                    f"{existing if existing is not None else '(new)'} -> {formatted}"
                )
    indicator["lastUpdated"] = now_iso


def collect_updates(target_year):
    """Fetch every Census source and return {indicator_id: updates}."""
    sources = {}

    try:
        ft900 = fetch_ft900(target_year)
        sources["trade-deficit"] = {
            None: {
                m: format_millions(v["deficit"])
                for m, v in ft900.items() if "deficit" in v
            },
            "imports": {
                m: format_millions(v["imports"])
                for m, v in ft900.items() if "imports" in v
            },
            "exports": {
                m: format_millions(v["exports"])
                for m, v in ft900.items() if "exports" in v
            },
        }
    except Exception as e:
        logger.error("FT-900 fetch failed: %s", e)

    return sources


def update_financials(dry_run=False):
    with open(FINANCIALS_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    now = datetime.now(timezone.utc)
    now_iso = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    target_year = now.year
    year_key = str(target_year)

    logger.info("Target calendar year: %d", target_year)

    sources = collect_updates(target_year)

    changes = []
    found = set()
    for indicator in data.get("indices", []):
        indicator_id = indicator.get("id")
        if indicator_id not in sources:
            continue
        if indicator.get("agency") != "Census":
            logger.warning(
                "Skipping %s: agency is %r, expected 'Census'",
                indicator_id, indicator.get("agency"),
            )
            continue
        write_month_values(indicator, year_key, sources[indicator_id], now_iso, changes)
        found.add(indicator_id)

    for indicator_id in set(sources) - found:
        logger.error("Indicator '%s' not found in financials-data.json", indicator_id)

    data["lastUpdated"] = now_iso

    if changes:
        logger.info("Updates:")
        for change in changes:
            logger.info("  - %s", change)
    else:
        logger.info("No changes for %d", target_year)

    if dry_run:
        logger.info("Dry run: %d changes previewed, JSON not written", len(changes))
        return

    with open(FINANCIALS_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

    logger.info("Saved %d changes to %s", len(changes), FINANCIALS_PATH)


def main():
    parser = argparse.ArgumentParser(
        description="Fetch Census Bureau indicators into financials-data.json",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without writing financials-data.json",
    )
    args = parser.parse_args()
    update_financials(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
