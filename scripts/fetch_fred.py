#!/usr/bin/env python3
"""
Fetch economic indicators from FRED API and update financials-data.json.
Requires FRED_API_KEY environment variable.
Get your free key at: https://fred.stlouisfed.org/docs/api/api_key.html

Updates only indicators where agency == "FRED" in the JSON data.
For monthly-frequency series, uses the latest monthly observation.
For daily/weekly series, uses the latest observation and updates the
corresponding month/year in the data file.

Consumer Sentiment is fetched directly from the University of Michigan CSV
(see fetch_umich_sentiment) rather than FRED's UMCSENT series, because FRED
delays that series by 1 month at the source's request and would otherwise lag
the actual release date.
"""

import json
import os
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
FRED_API_KEY = os.environ.get("FRED_API_KEY")

if not FRED_API_KEY:
    print("Error: FRED_API_KEY environment variable not set.")
    print("Get your free key at https://fred.stlouisfed.org/docs/api/api_key.html")
    sys.exit(1)

# Map indicator name (as stored in financials-data.json) to FRED series ID
INDICATOR_MAP = {
    "10-yr Treasury Yield": "DGS10",
    "CPI": "CPIAUCSL",
    "PPI": "PPIACO",
    "Unemployment Rate": "UNRATE",
    "Jobs": "PAYEMS",
    "Average Hourly Earnings": "CES0500000003",
    "Jobless Claims": "ICSA",
    "Monthly Retail Sales": "RSAFS",
    "Industrial Production Index": "INDPRO",
    "Capacity Utilization": "TCU",
    "Consumer Confidence": "CONF",
    "Small Business Optimism Index": "NFIB",
    "Housing Starts": "HOUST",
    "New Home Sales": "HSN1F",
    "Building Permits": "PERMIT",
    "Case-Shiller National Home Price Index": "CSUSHPINSA",
    "30-yr Mortgage Rate": "MORTGAGE30US",
    "Affordability Index": "FIXHAI",
    "Oil (WTI)": "DCOILWTICO",
    "Natural Gas": "DHHNGSP",
    "U.S. Petroleum Exports": "PAUELS",
    "Oil (Brent)": "DCOILBRENTEU",
    "Personal Consumption Expenditures (PCE)": "PCE",
    "Dollar Value Index": "DTWEXBGS",
}

# Consumer Sentiment is fetched directly from the University of Michigan CSV
# (see fetch_umich_sentiment) because FRED's UMCSENT series is delayed 1 month
# at the source's request and lags the actual release date.
UMICH_SENTIMENT_URL = "https://www.sca.isr.umich.edu/files/tbcics.csv"

# Indicators whose values are in thousands on FRED and need *1000
PAYROLLS_INDICATORS = {"Jobs"}
# Weekly series where the JSON stores monthly averages
WEEKLY_SERIES = {"Jobless Claims"}
# Indicators that need billions-style formatting (comma + "B" suffix)
BILLIONS_INDICATORS = {"Personal Consumption Expenditures (PCE)"}
# Indicators whose FRED values are in millions and need /1000 for billions formatting
MILLIONS_INDICATORS = {"Monthly Retail Sales"}

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


def fetch_umich_sentiment():
    """Fetch the latest Index of Consumer Sentiment from the University of Michigan CSV.

    Returns a list of (month_name, year, value) tuples, most recent first.
    The CSV is not delayed like FRED's UMCSENT series, so it reflects the
    actual release date (including preliminary prints marked "(P)").
    """
    try:
        resp = requests.get(UMICH_SENTIMENT_URL, timeout=30)
        resp.raise_for_status()
    except Exception as e:
        print(f"  Error fetching UMich sentiment CSV: {e}")
        return []

    rows = []
    for line in resp.text.splitlines():
        parts = [p.strip() for p in line.split(",")]
        if len(parts) < 2:
            continue
        month_raw, year_raw = parts[0], parts[1]
        if not month_raw or not year_raw:
            continue
        try:
            year = int(year_raw)
            month_name = month_raw.split()[0].lower()
        except (ValueError, IndexError):
            continue
        if month_name not in MONTH_MAP.values():
            continue
        # The index value is the first numeric cell in the row (the CSV has
        # several leading empty columns before it).
        value_raw = ""
        for cell in parts[2:]:
            if cell:
                value_raw = cell
                break
        if not value_raw:
            continue
        try:
            value = float(value_raw)
        except ValueError:
            continue
        rows.append((month_name, year, value, month_raw))

    rows.sort(key=lambda r: (r[1], list(MONTH_MAP.values()).index(r[0])), reverse=True)
    return rows


def update_umich_sentiment(data, now_iso):
    """Update the Consumer Sentiment indicator from the UMich CSV."""
    rows = fetch_umich_sentiment()
    if not rows:
        print("  No UMich sentiment data fetched")
        return []

    indicator = None
    for idx in data.get("indices", []):
        if idx.get("name") == "Consumer Sentiment" and idx.get("agency") == "FRED":
            indicator = idx
            break
    if not indicator:
        print("  Consumer Sentiment indicator not found or not FRED-sourced in JSON")
        return []

    updates = []
    for month_name, year, value, month_raw in rows:
        year_str = str(year)
        existing_value = indicator.get(year_str, {}).get(month_name)
        formatted = str(round(value, 1))
        if existing_value is None:
            if year_str not in indicator:
                indicator[year_str] = {}
            indicator[year_str][month_name] = formatted
            updates.append(f"Consumer Sentiment ({year_str} {month_name}): {formatted} (new)")
        elif existing_value != formatted:
            if year_str not in indicator:
                indicator[year_str] = {}
            indicator[year_str][month_name] = formatted
            updates.append(f"Consumer Sentiment ({year_str} {month_name}): {existing_value} -> {formatted}")

    indicator["lastUpdated"] = now_iso
    return updates


def format_value(value, indicator_name, existing_value=None):
    """Format a numeric value based on indicator type and existing format."""
    if indicator_name in BILLIONS_INDICATORS:
        return f"{value:,.1f}B"
    if indicator_name in MILLIONS_INDICATORS:
        return f"{value / 1000:,.1f}B"
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

    # Consumer Sentiment is pulled from the University of Michigan CSV directly,
    # since FRED's UMCSENT series is delayed 1 month at the source's request.
    umich_updates = update_umich_sentiment(data, now_iso)
    updates.extend(umich_updates)

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
