#!/usr/bin/env python3
"""
Fetch U.S. Treasury indicators from the Treasury Fiscal Data API and
update the Treasury-sourced indicators in json/financials-data.json.

API (open, no key required):
  Base: https://api.fiscaldata.treasury.gov/services/api/fiscal_service
  Docs: https://fiscaldata.treasury.gov/api-documentation/

Indicators updated (agency == "Treasury"):
  treasury-debt-level      v2/accounting/od/debt_to_penny         (tot_pub_debt_out_amt)
  monthly-budget-deficit   v1/accounting/mts/mts_table_1          (current_month_* fields)
  interest-on-debt         v1/accounting/mts/mts_table_3 line 360 (current_month_rcpt_outly_amt)
  tariff-revenue           v1/accounting/mts/mts_table_4 line 405 (current_month_net_rcpt_amt)

Only the current calendar year's nested year object (e.g. "2026": {"january": ...})
is written. Flat top-level month fields hold prior-year data and are left untouched,
so charts never double-plot a month.

Usage:
  python3 scripts/fetch_treasury.py            # fetch and update the JSON
  python3 scripts/fetch_treasury.py --dry-run  # preview changes without writing
"""

import argparse
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

from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

load_dotenv()

BASE_URL = "https://api.fiscaldata.treasury.gov/services/api/fiscal_service"
ROOT = Path(__file__).resolve().parent.parent
FINANCIALS_PATH = ROOT / "json" / "financials-data.json"

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

# MTS Table 1 line_code_nbr -> calendar month within the release's fiscal year.
# The fiscal year runs October - September; 280 is fiscal year-to-date.
# classification_desc month names repeat across fiscal years, so rows must be
# keyed by line_code_nbr, not by classification_desc.
FISCAL_MONTH_MAP = {
    160: "october", 170: "november", 180: "december",
    190: "january", 200: "february", 210: "march", 220: "april",
    230: "may", 240: "june", 250: "july", 260: "august", 270: "september",
}

# Indicator id -> fetched updates. None is the indicator's own month fields.
INDICATOR_IDS = ("treasury-debt-level", "monthly-budget-deficit", "interest-on-debt", "tariff-revenue")


@retry(
    retry=retry_if_exception_type(requests.RequestException),
    stop=stop_after_attempt(4),
    wait=wait_exponential(multiplier=2, min=3, max=30),
)
def fetch_fiscal_data(endpoint, params):
    """Fetch the data array from a Treasury Fiscal Data API endpoint."""
    resp = requests.get(f"{BASE_URL}{endpoint}", params=params, timeout=30)
    if resp.status_code == 429:
        raise requests.RequestException("Rate limited (429)")
    resp.raise_for_status()
    return resp.json().get("data", [])


def fetch_debt_month_ends(target_year):
    """Latest month-end total public debt outstanding for each month of target_year."""
    rows = fetch_fiscal_data(
        "/v2/accounting/od/debt_to_penny",
        {"page[size]": 1000, "sort": "-record_date"},
    )
    latest_by_month = {}
    for row in rows:
        if int(row.get("record_calendar_year") or 0) != target_year:
            continue
        month_key = MONTH_MAP.get(row.get("record_calendar_month"))
        if not month_key:
            continue
        current = latest_by_month.get(month_key)
        if current is None or row["record_date"] > current["record_date"]:
            latest_by_month[month_key] = row

    # Drop the still-open month: a month only counts once it has fully elapsed,
    # otherwise we would store a mid-month snapshot as the month's value.
    now = datetime.now(timezone.utc)
    return {
        month_key: float(row["tot_pub_debt_out_amt"])
        for month_key, row in latest_by_month.items()
        if (int(row["record_calendar_year"]), int(row["record_calendar_month"]))
        < (now.year, now.month)
    }


def fetch_mts_table_1(target_year):
    """Receipts, outlays, and deficit/surplus for each month of target_year.

    Uses only the latest MTS release, which carries every fiscal
    year-to-date month.
    """
    rows = fetch_fiscal_data(
        "/v1/accounting/mts/mts_table_1",
        {"page[size]": 100, "sort": "-record_date"},
    )
    if not rows:
        return {}
    latest_date = max(row["record_date"] for row in rows)
    release = [row for row in rows if row["record_date"] == latest_date]
    fiscal_year = int(release[0].get("record_fiscal_year") or 0)

    out = {}
    for row in release:
        code = int(row.get("line_code_nbr") or 0)
        month_key = FISCAL_MONTH_MAP.get(code)
        if not month_key:
            continue
        # Oct-Dec belong to the prior calendar year; Jan-Sep to the fiscal year.
        month_year = fiscal_year - 1 if code < 190 else fiscal_year
        if month_year != target_year:
            continue
        out[month_key] = {
            "receipts": float(row["current_month_gross_rcpt_amt"]),
            "outlays": float(row["current_month_gross_outly_amt"]),
            # API convention: positive = deficit. The JSON stores the negated value.
            "deficit": -float(row["current_month_dfct_sur_amt"]),
        }
    return out


def fetch_mts_line(endpoint, value_field, line_code, target_year):
    """Single-month MTS table values for one classification line.

    Each release covers one month; record_calendar_year/month identify
    the data month.
    """
    rows = fetch_fiscal_data(endpoint, {"page[size]": 500, "sort": "-record_date"})
    out = {}
    for row in rows:
        if int(row.get("line_code_nbr") or 0) != line_code:
            continue
        if int(row.get("record_calendar_year") or 0) != target_year:
            continue
        month_key = MONTH_MAP.get(row.get("record_calendar_month"))
        if month_key:
            out[month_key] = float(row[value_field])
    return out


def format_debt_level(value):
    return f"${value:,.2f}"


def format_billions(value):
    return f"${round(value / 1e9)}B"


def format_millions(value):
    return f"{round(value / 1e6):,}"


def format_deficit(value):
    """value > 0 is a surplus; value < 0 is a deficit."""
    sign = "+" if value >= 0 else "-"
    return f"{sign}${abs(round(value / 1e6)):,}M"


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
    """Fetch every Treasury source and return {indicator_id: updates}."""
    sources = {}

    try:
        debt = fetch_debt_month_ends(target_year)
        sources["treasury-debt-level"] = {
            None: {m: format_debt_level(v) for m, v in debt.items()},
        }
    except Exception as e:
        logger.error("Debt to the Penny fetch failed: %s", e)

    try:
        table1 = fetch_mts_table_1(target_year)
        sources["monthly-budget-deficit"] = {
            None: {m: format_deficit(v["deficit"]) for m, v in table1.items()},
            "receipts": {m: format_millions(v["receipts"]) for m, v in table1.items()},
            "outlays": {m: format_millions(v["outlays"]) for m, v in table1.items()},
        }
    except Exception as e:
        logger.error("MTS table 1 fetch failed: %s", e)

    try:
        interest = fetch_mts_line(
            "/v1/accounting/mts/mts_table_3",
            "current_month_rcpt_outly_amt",
            360,
            target_year,
        )
        sources["interest-on-debt"] = {
            None: {m: format_billions(v) for m, v in interest.items()},
        }
    except Exception as e:
        logger.error("MTS table 3 fetch failed: %s", e)

    try:
        customs = fetch_mts_line(
            "/v1/accounting/mts/mts_table_4",
            "current_month_net_rcpt_amt",
            405,
            target_year,
        )
        sources["tariff-revenue"] = {
            None: {m: format_billions(v) for m, v in customs.items()},
        }
    except Exception as e:
        logger.error("MTS table 4 fetch failed: %s", e)

    return sources


def update_financials(dry_run=False):
    with open(FINANCIALS_PATH, "r") as f:
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
        if indicator.get("agency") != "Treasury":
            logger.warning(
                "Skipping %s: agency is %r, expected 'Treasury'",
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

    with open(FINANCIALS_PATH, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")

    logger.info("Saved %d changes to %s", len(changes), FINANCIALS_PATH)


def main():
    parser = argparse.ArgumentParser(
        description="Fetch Treasury Fiscal Data API indicators into financials-data.json",
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
