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

import argparse
import csv
import io
import json

def fetch_fred_csv_observations(series_id, limit=100):
    """Fallback: fetch observations from FRED's CSV endpoint."""
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"
    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
    except Exception as e:
        print(f"  CSV fallback error for {series_id}: {e}")
        return []
    rows = []
    reader = csv.reader(io.StringIO(resp.text))
    header = next(reader, None)
    for row in reader:
        if len(row) < 2:
            continue
        date_str, val = row[0].strip(), row[1].strip()
        if not date_str or val in ("", "."):
            continue
        try:
            float(val)
        except ValueError:
            continue
        rows.append({"date": date_str, "value": val})
    rows.sort(key=lambda r: r["date"], reverse=True)
    return rows[:limit]

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
# Use seasonally adjusted series where applicable to match series consistency
INDICATOR_MAP = {
    "10-yr Treasury Yield": "DGS10",
    "CPI": "CPIAUCSL",  # SA
    "PPI": "PPIFIS",  # SA Final Demand Producer Price Index
    "Unemployment Rate": "UNRATE",  # SA
    "Jobs": "PAYEMS",  # SA
    "Average Hourly Earnings": "CES0500000003",  # SA
    "Jobless Claims": "ICSA",  # SA
    "Monthly Retail Sales": "RSAFS",  # SA
    "Industrial Production Index": "INDPRO",  # SA
    "Capacity Utilization": "TCU",  # SA
    "Small Business Optimism Index": "NFIB",  # NSA/seasonally not standard; keep as is
    "Housing Starts": "HOUST",  # SA
    "New Home Sales": "HSN1F",  # SA
    "Building Permits": "PERMIT",  # SA
    "Case-Shiller National Home Price Index": "CSUSHPINSA",  # SA
    "FHFA House Price Index": "USSTHPI",  # SA
    "30-yr Mortgage Rate": "MORTGAGE30US",  # NSA weekly avg
    "Affordability Index": "FIXHAI",  # NSA
    "Oil (WTI)": "DCOILWTICO",  # spot; not SA
    "Natural Gas": "DHHNGSP",  # spot; not SA
    "U.S. Petroleum Exports": "PAUELS",  # weekly
    "Oil (Brent)": "DCOILBRENTEU",  # spot; not SA
    "Personal Consumption Expenditures (PCE)": "PCE",  # SA in level? PCE is nominal; check - but keep existing series; values stored as formatted
    "Dollar Value Index": "DTWEXBGS",  # daily index, not SA
    "Lumber (PPI)": "WPU081",  # PPI by Commodity: Lumber
}

# Consumer Confidence (Conference Board) is NOT auto-fetched here.
# The Conference Board does not publish a public machine-readable feed for its
# Consumer Confidence Index (data is behind a paywall). Update it manually from
# the monthly press release at https://www.conference-board.org/data/consumerdata.cfm
# (published ~last Tuesday of each month at 10 AM ET). ALWAYS check for revisions
# to prior months in the same release before writing the new value.

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
MILLIONS_INDICATORS = {"Monthly Retail Sales", "Personal Consumption Expenditures (PCE)"}
# Indicators whose FRED values are in thousands and need *1000 before formatting
THOUSANDS_INDICATORS = {"New Home Sales", "Housing Starts", "Building Permits"}

# Default decimal precision for new months when no existing value exists to
# copy precision from. Without this, the generic rules (values >= 10 get 0
# decimals) would drop meaningful precision for large indicators like PCE.
DEFAULT_DECIMALS = {
    "Personal Consumption Expenditures (PCE)": 1,
}
# Indicators that are inherently volatile; raise threshold for warnings
VOLATILE_INDICATORS = {
    "Oil (WTI)",
    "Oil (Brent)",
    "20ft Equivalents (TEUs)",
    "Shipping Container Rate (China-US 40ft)",
    "Lumber (PPI)",
    "Urea",
    "Crack Margin",
    "U.S. Petroleum Exports",
}

MONTH_MAP = {
    "01": "january", "02": "february", "03": "march", "04": "april",
    "05": "may", "06": "june", "07": "july", "08": "august",
    "09": "september", "10": "october", "11": "november", "12": "december",
}



import time

def fetch_fred_observations(series_id, limit=100, retries=3):
    """Fetch the latest observations from the FRED API with retry on transient errors."""
    url = "https://api.stlouisfed.org/fred/series/observations"
    params = {
        "series_id": series_id,
        "api_key": FRED_API_KEY,
        "file_type": "json",
        "limit": limit,
        "sort_order": "desc",
    }
    for attempt in range(retries):
        try:
            resp = requests.get(url, params=params, timeout=30)
            if resp.status_code in (400, 404, 423):
                print(f"  HTTP {resp.status_code} for {series_id}; trying CSV fallback")
                return fetch_fred_csv_observations(series_id, limit)
            if resp.status_code in (429, 500, 502, 503, 504):
                wait = 2 ** attempt
                print(f"  HTTP {resp.status_code} for {series_id}; retrying in {wait}s")
                time.sleep(wait)
                continue
            resp.raise_for_status()
            return resp.json().get("observations", [])
        except Exception as e:
            print(f"  Error fetching {series_id}: {e}")
            if attempt == retries - 1:
                print(f"  Trying CSV fallback for {series_id}")
                return fetch_fred_csv_observations(series_id, limit)
            time.sleep(2 ** attempt)
            continue
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
        fractional = existing_value.split(".")[1]
        # Remove B/M suffixes and commas
        cleaned = fractional.rstrip("BM").replace(",", "")
        return len(cleaned)
    return 0


def format_value(value, indicator_name, existing_value):
    """Format a numeric observation according to indicator rules.

    - Applies scaling:
      * PAYROLLS_INDICATORS and THOUSANDS_INDICATORS are multiplied by 1000.
      * MILLIONS_INDICATORS are divided by 1000 to convert to billions.
    - Appends "B" for indicators treated as billions (BILLIONS_INDICATORS and MILLIONS_INDICATORS).
    - Uses decimal precision from existing_value when available; otherwise uses sensible defaults.
    - Preserves format style (M/B suffixes) from existing value when present.
    """
    # Work on a local copy
    val = float(value)

    # Apply indicator-specific scaling
    if indicator_name in PAYROLLS_INDICATORS or indicator_name in THOUSANDS_INDICATORS:
        val = val * 1000.0

    # If the series is given in millions and we want billions, convert
    if indicator_name in MILLIONS_INDICATORS:
        val = val / 1000.0

    is_billion = indicator_name in BILLIONS_INDICATORS or indicator_name in MILLIONS_INDICATORS

    # Determine decimal places and format style from existing value
    decimals = None
    format_suffix = ''  # To track M/B suffixes
    if existing_value:
        try:
            # Check for M/B suffixes
            if existing_value.endswith('M'):
                format_suffix = 'M'
                numeric_part = existing_value[:-1]
            elif existing_value.endswith('B'):
                format_suffix = 'B'
                numeric_part = existing_value[:-1]
            else:
                numeric_part = existing_value
            
            # Detect decimal places in the numeric part
            if '.' in numeric_part:
                fractional = numeric_part.split('.')[1]
                # Remove commas for decimal count
                cleaned = fractional.replace(',', '')
                decimals = len(cleaned)
            else:
                decimals = 0
        except Exception:
            decimals = None
            format_suffix = ''

    if decimals is None:
        # Use indicator-specific default precision when available, then fall
        # back to sensible generic defaults:
        # - small numbers: 2 decimals
        # - below 10: 1 decimal
        # - otherwise: no decimals
        decimals = DEFAULT_DECIMALS.get(indicator_name)
        if decimals is None:
            abs_val = abs(val)
            if abs_val < 1:
                decimals = 2
            elif abs_val < 10:
                decimals = 1
            else:
                decimals = 0

    # Round to desired decimals before formatting to avoid floating noise
    rounded = round(val, decimals)

    # Apply format based on detected suffix or indicator rules
    if format_suffix == 'M':
        # Format as X.XXXM (millions format)
        # Convert value to millions for display
        millions_val = rounded / 1000000.0
        if decimals > 0:
            fmt = f"{{:.{decimals}f}}M"
            return fmt.format(millions_val)
        else:
            return f"{int(round(millions_val))}M"
    elif format_suffix == 'B':
        # Format as X.XXXB (billions format)
        # Value has already been scaled to billions by the MILLIONS_INDICATORS
        # rule above, so format `rounded` directly without another /1e9.
        billions_val = rounded
        if decimals > 0:
            fmt = f"{{:,.{decimals}f}}B"
            return fmt.format(billions_val)
        else:
            return f"{int(round(billions_val)):,}B"
        if decimals > 0:
            fmt = f"{{:.{decimals}f}}B"
            return fmt.format(billions_val)
        else:
            return f"{int(round(billions_val))}B"
    elif is_billion:
        # comma + decimals + "B" suffix
        fmt = f"{{:,.{decimals}f}}B"
        return fmt.format(rounded)
    else:
        # regular number formatting (commas; decimals only if >0)
        if decimals > 0:
            fmt = f"{{:,.{decimals}f}}"
            return fmt.format(rounded)
        else:
            return f"{int(round(rounded)):,}"


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
    had_new_month = False
    for month_name, year, value, month_raw in rows:
        year_str = str(year)
        existing_value = indicator.get(year_str, {}).get(month_name)
        formatted = str(round(value, 1))
        if existing_value is None:
            if year_str not in indicator:
                indicator[year_str] = {}
            indicator[year_str][month_name] = formatted
            had_new_month = True
            updates.append(f"Consumer Sentiment ({year_str} {month_name}): {formatted} (new)")
        elif existing_value != formatted:
            mom_pct, yoy_pct = compute_mom_yoy(existing_value, formatted)
            warning = validate_large_change("Consumer Sentiment", mom_pct, yoy_pct)
            if year_str not in indicator:
                indicator[year_str] = {}
            indicator[year_str][month_name] = formatted
            msg = f"Consumer Sentiment ({year_str} {month_name}): {existing_value} -> {formatted}"
            if warning:
                msg = f"WARNING: {warning}; {msg}"
            updates.append(msg)
        else:
            # Revision-less re-fetch: no new month, no badge.
            pass

    indicator["newMonth"] = had_new_month
    indicator["lastUpdated"] = now_iso
    return updates


def compute_mom_yoy(existing_val_str, new_val_str):
    """Compute MoM and YoY percent changes if possible."""
    try:
        # Strip non-numeric chars except . - ,
        def parse(v):
            if not v:
                return None
            v = str(v).strip()
            # Remove currency symbols, commas, B, M suffixes
            for ch in ['$', 'B', 'M', 'K', ' ']:
                v = v.replace(ch, '')
            v = v.replace(',', '')
            return float(v)
        old = parse(existing_val_str)
        new = parse(new_val_str)
        if old is None or new is None or old == 0:
            return None, None
        mom = ((new - old) / abs(old)) * 100.0
        # YoY requires comparing to same month last year - but we don't have it here; skip
        return mom, None
    except Exception:
        return None, None


def validate_large_change(indicator_name, mom_pct, yoy_pct):
    """Flag unusually large changes that may indicate series consistency."""
    if mom_pct is None and yoy_pct is None:
        return None
    # Higher threshold for volatile series
    mom_thresh = 25.0 if indicator_name in VOLATILE_INDICATORS else 10.0
    yoy_thresh = 40.0 if indicator_name in VOLATILE_INDICATORS else 20.0
    if mom_pct is not None and abs(mom_pct) > mom_thresh:
        return f"Large MoM change ({mom_pct:+.1f}%) for {indicator_name} - verify series consistency (SA/NSA, base, vintage)"
    if yoy_pct is not None and abs(yoy_pct) > yoy_thresh:
        return f"Large YoY change ({yoy_pct:+.1f}%) for {indicator_name} - verify series consistency (SA/NSA, base, vintage)"
    return None


def update_financials(indicator_names=None):
    with open(FINANCIALS_PATH, "r") as f:
        data = json.load(f)

    now = datetime.now(timezone.utc)
    now_iso = now.strftime("%Y-%m-%dT%H:%M:%SZ")

    updates = []

    selected = (
        {n.strip() for n in indicator_names}
        if indicator_names
        else set(INDICATOR_MAP.keys())
    )

    for indicator_name, series_id in INDICATOR_MAP.items():
        if indicator_name not in selected:
            continue
        print(f"Fetching {indicator_name} ({series_id})...")

        observations = fetch_fred_observations(series_id, limit=100)
        if not observations:
            print(f"  No data for {indicator_name}")
            continue

        is_weekly = indicator_name in WEEKLY_SERIES

        # Build a month -> value map from all returned observations so that
        # revised (and newly released) months are both pulled, not just the latest.
        monthly_values = {}
        if is_weekly:
            # Group observations by month and average them.
            months_seen = set()
            for obs in observations:
                d = obs.get("date")
                if not d:
                    continue
                ym = (int(d[:4]), int(d[5:7]))
                months_seen.add(ym)
            for (y, m) in months_seen:
                v = get_monthly_average(observations, y, m)
                if v is not None:
                    monthly_values[(y, m)] = v
        else:
            # Monthly/spot series: use the last observation within each month.
            # Observations are sorted desc, so first occurrence per month wins.
            seen = set()
            for obs in observations:
                d = obs.get("date")
                val = obs.get("value")
                if not d or not val or val == ".":
                    continue
                ym = (int(d[:4]), int(d[5:7]))
                if ym in seen:
                    continue
                seen.add(ym)
                try:
                    monthly_values[ym] = float(val)
                except ValueError:
                    continue

        if not monthly_values:
            print(f"  No data for {indicator_name}")
            continue

        found = False
        for idx in data.get("indices", []):
            if idx.get("name") == indicator_name and idx.get("agency") == "FRED":
                had_new_month = False
                for (year, month), value in monthly_values.items():
                    year_str = str(year)
                    month_key = MONTH_MAP[f"{month:02d}"]
                    if year_str not in idx:
                        idx[year_str] = {}

                    existing_value = idx[year_str].get(month_key)
                    formatted = format_value(value, indicator_name, existing_value)

                    if existing_value is None:
                        idx[year_str][month_key] = formatted
                        had_new_month = True
                        updates.append(
                            f"{indicator_name} ({year_str} {month_key}): {formatted} (new)"
                        )
                    elif existing_value != formatted:
                        mom_pct, yoy_pct = compute_mom_yoy(existing_value, formatted)
                        warning = validate_large_change(indicator_name, mom_pct, yoy_pct)
                        idx[year_str][month_key] = formatted
                        msg = (
                            f"{indicator_name} ({year_str} {month_key}): "
                            f"{existing_value} -> {formatted}"
                        )
                        if warning:
                            msg = f"WARNING: {warning}; {msg}"
                        updates.append(msg)
                    # else: no change, skip

                idx["newMonth"] = had_new_month
                idx["lastUpdated"] = now_iso
                found = True
                break

        if not found:
            print(f"  Indicator '{indicator_name}' not found or not FRED-sourced in JSON")

    if not indicator_names or "Consumer Sentiment" in indicator_names:
        umich_updates = update_umich_sentiment(data, now_iso)
        updates.extend(umich_updates)

    data["lastUpdated"] = now_iso

    with open(FINANCIALS_PATH, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"\nUpdated {len(updates)} values:")
    for u in updates:
        print(f"  - {u}")

    print(f"\nSaved to {FINANCIALS_PATH}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Fetch economic indicators from FRED API and update financials-data.json.",
    )
    parser.add_argument(
        "--indicators",
        help="Comma-separated list of indicator names to fetch (default: all FRED-sourced)",
    )
    args = parser.parse_args()
    indicator_names = (
        {n.strip() for n in args.indicators.split(",")} if args.indicators else None
    )
    update_financials(indicator_names)
