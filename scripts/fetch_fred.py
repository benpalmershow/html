#!/usr/bin/env python3
"""
Fetch economic indicators from FRED API and update financials-data.json.
Requires FRED_API_KEY environment variable.
Get your free key at: https://fred.stlouisfed.org/docs/api/api_key.html

Updates only indicators where agency == "FRED" in the JSON data.
For monthly-frequency series, uses the latest monthly observation.
For daily/weekly series, uses the latest observation and updates the
corresponding month/year in the data file.
"""

import json
import os
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

try:
    import requests
except ImportError:
    print("requests is required. Install with: pip install requests")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
FINANCIALS_PATH = ROOT / "json" / "financials-data.json"
FRED_API_KEY = os.environ.get("FRED_API_KEY")

if not FRED_API_KEY:
    print("Error: FRED_API_KEY environment variable not set.")
    print("Get your free key at https://fred.stlouisfed.org/docs/api/api_key.html")
    sys.exit(1)

# Map indicator name (as stored in financials-data.json) to FRED series ID
INDICATOR_MAP = {
    "10-yr Treasury Yield": "DGS10",
    "30-yr Treasury Yield": "DGS30",
    "3-month Treasury Yield": "DGS3MO",
    "2-yr Treasury Yield": "DGS2Y",
    "CPI": "CPIAUCSL",
    "Core CPI": "CPILFESL",
    "PPI": "PPIACO",
    "Core PPI": "PPIFG",
    "Unemployment Rate": "UNRATE",
    "Jobs": "PAYEMS",
    "Average Hourly Earnings": "CES0500000003",
    "Jobless Claims": "ICSA",
    "Continuing Jobless Claims": "CCSA",
    "Retail Sales": "RSAFS",
    "Industrial Production": "INDPRO",
    "Capacity Utilization": "TCU",
    "Consumer Sentiment": "UMCSENT",
    "Consumer Confidence": "CONF",
    "NFIB Small Business Optimism": "NFIB",
    "Housing Starts": "HOUST",
    "New Home Sales": "HSN1F",
    "Building Permits": "PERMIT",
    "Case-Shiller National Home Price Index": "CSUSHPINSA",
    "30-yr Mortgage Rate": "MORTGAGE30US",
    "Affordability Index": "FIXHAI",
    "Oil (WTI)": "DCOILWTICO",
    "Natural Gas": "DHHNGSP",
    "U.S. Petroleum Exports": "PAUELS",
    "Personal Consumption Expenditures (PCE)": "PCE",
    "Dollar Value Index": "DTWEXBGS",
}

# Indicators whose values are in thousands on FRED and need *1000
PAYROLLS_INDICATORS = {"Jobs"}
# Weekly series where the JSON stores monthly averages
WEEKLY_SERIES = {"Jobless Claims"}
# Indicators that need billions-style formatting (comma + "B" suffix)
BILLIONS_INDICATORS = {"Personal Consumption Expenditures (PCE)"}

MONTH_MAP = {
    "01": "january", "02": "february", "03": "march", "04": "april",
    "05": "may", "06": "june", "07": "july", "08": "august",
    "09": "september", "10": "october", "11": "november", "12": "december",
}


def fetch_fred_observations(series_id, limit=100):
    """Fetch the latest observations from the FRED API."""
    url = "https://api.stlouisfed.org/fred/series/observations"
    params = {
        "series_id": series_id,
        "api_key": FRED_API_KEY,
        "file_type": "json",
        "limit": limit,
        "sort_order": "desc",
    }
    try:
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
        return resp.json().get("observations", [])
    except Exception as e:
        print(f"  Error fetching {series_id}: {e}")
        return []


def get_latest_observation(observations):
    """Return the date and value of the latest non-null observation."""
    for obs in observations:
        val = obs.get("value")
        if val and val != ".":
            try:
                return obs.get("date"), float(val)
            except ValueError:
                continue
    return None, None


def get_monthly_average(observations, year, month):
    """Compute the average of all observations in a given month/year."""
    month_str = f"{year:04d}-{month:02d}"
    values = []
    for obs in observations:
        date_str = obs.get("date", "")
        val = obs.get("value", "")
        if not date_str.startswith(month_str) or not val or val == ".":
            continue
        try:
            values.append(float(val))
        except ValueError:
            continue
    if not values:
        return None
    return sum(values) / len(values)


def detect_decimals(existing_value):
    """Detect the number of decimal places from an existing value string."""
    if "." in existing_value:
        return len(existing_value.split(".")[1].rstrip("B").replace(",", ""))
    return 0


def format_value(value, indicator_name, existing_value=None):
    """Format a numeric value based on indicator type and existing format."""
    if indicator_name in BILLIONS_INDICATORS:
        return f"{value:,.1f}B"
    if indicator_name in PAYROLLS_INDICATORS:
        return f"{int(round(value * 1000)):,}"
    if existing_value:
        if "," in existing_value and "." not in existing_value:
            return f"{int(round(value)):,}"
        decimals = detect_decimals(existing_value)
        return str(round(value, decimals))
    return str(round(value, 2))


def update_financials():
    with open(FINANCIALS_PATH, "r") as f:
        data = json.load(f)

    now = datetime.now(timezone.utc)
    now_iso = now.strftime("%Y-%m-%dT%H:%M:%SZ")

    updates = []

    for indicator_name, series_id in INDICATOR_MAP.items():
        print(f"Fetching {indicator_name} ({series_id})...")

        observations = fetch_fred_observations(series_id, limit=100)
        if not observations:
            print(f"  No data for {indicator_name}")
            continue

        is_weekly = indicator_name in WEEKLY_SERIES

        if is_weekly:
            date_str, _ = get_latest_observation(observations)
            if date_str is None:
                print(f"  No data for {indicator_name}")
                continue
            year, month = int(date_str[:4]), int(date_str[5:7])
            value = get_monthly_average(observations, year, month)
        else:
            date_str, value = get_latest_observation(observations)
            if date_str is None:
                print(f"  No data for {indicator_name}")
                continue
            year, month = int(date_str[:4]), int(date_str[5:7])

        month_key = MONTH_MAP[f"{month:02d}"]
        year_str = str(year)

        if value is None:
            print(f"  No valid value for {indicator_name}")
            continue

        found = False
        for idx in data.get("indices", []):
            if idx.get("name") == indicator_name and idx.get("agency") == "FRED":
                if year_str not in idx:
                    idx[year_str] = {}

                existing_value = idx[year_str].get(month_key)
                formatted = format_value(value, indicator_name, existing_value)

                if existing_value is None:
                    idx[year_str][month_key] = formatted
                    updates.append(
                        f"{indicator_name} ({year_str} {month_key}): {formatted} (new)"
                    )
                elif existing_value != formatted:
                    idx[year_str][month_key] = formatted
                    updates.append(
                        f"{indicator_name} ({year_str} {month_key}): "
                        f"{existing_value} -> {formatted}"
                    )

                idx["lastUpdated"] = now_iso
                found = True
                break

        if not found:
            print(f"  Indicator '{indicator_name}' not found or not FRED-sourced in JSON")

    data["lastUpdated"] = now_iso

    with open(FINANCIALS_PATH, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")

    print(f"\nUpdated {len(updates)} values:")
    for u in updates:
        print(f"  - {u}")

    print(f"\nSaved to {FINANCIALS_PATH}")


if __name__ == "__main__":
    update_financials()
