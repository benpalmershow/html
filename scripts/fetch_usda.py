#!/usr/bin/env python3
"""
Fetch USDA NASS agricultural price data and update financials-data.json.

Prefers the Quick Stats API (https://quickstats.nass.usda.gov/api) when
NASS_API_KEY is set, and falls back to public text chart files if the API key
is unavailable or the API request fails. The key must be provided via the
NASS_API_KEY environment variable (never hardcoded).

Updates USDA NASS-sourced price indicators (Soybeans, Wheat, Beef) by writing
monthly values into "YYYY" buckets (latest and previous year when present).
"""

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import requests
except ImportError:
    print("requests is required. Install with: pip install requests")
    sys.exit(1)

from dotenv import load_dotenv
load_dotenv()

from fetch_utils import atomic_write_json

ROOT = Path(__file__).resolve().parent.parent
FINANCIALS_PATH = ROOT / "json" / "financials-data.json"

NASS_API_BASE = "https://quickstats.nass.usda.gov/api"
NASS_API_KEY = os.environ.get("NASS_API_KEY")
NASS_API_LIMIT = 50000

MONTHS = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
]
MONTH_TO_NUM = {m: i + 1 for i, m in enumerate(MONTHS)}

# Indicator config. "api" params are broad Quick Stats filters; rows are matched
# in code by short_desc/unit/domain/period to tolerate catalog field variations.
# "txt_url" is the legacy public fallback source.
INDICATORS = {
    "Soybeans": {
        "txt_url": "https://www.nass.usda.gov/Charts_and_Maps/graphics/data/pricesb.txt",
        "api": {
            "commodity_desc": "SOYBEANS",
            "statisticcat_desc": "PRICE RECEIVED",
            "agg_level_desc": "NATIONAL",
            "freq_desc": "MONTHLY",
        },
        "short_desc": "SOYBEANS - PRICE RECEIVED, MEASURED IN $ / BU",
        "unit_desc": "$ / BU",
    },
    "Wheat": {
        "txt_url": "https://www.nass.usda.gov/Charts_and_Maps/graphics/data/pricewh.txt",
        "api": {
            "commodity_desc": "WHEAT",
            "statisticcat_desc": "PRICE RECEIVED",
            "agg_level_desc": "NATIONAL",
            "freq_desc": "MONTHLY",
        },
        "short_desc": "WHEAT - PRICE RECEIVED, MEASURED IN $ / BU",
        "unit_desc": "$ / BU",
    },
    "Beef": {
        "txt_url": "https://www.nass.usda.gov/Charts_and_Maps/graphics/data/priceca.txt",
        "api": {
            "commodity_desc": "CATTLE",
            "statisticcat_desc": "PRICE RECEIVED",
            "agg_level_desc": "NATIONAL",
            "freq_desc": "MONTHLY",
        },
        "short_desc": "CATTLE, GE 500 LBS - PRICE RECEIVED, MEASURED IN $ / CWT",
        "unit_desc": "$ / CWT",
    },
}

MONTH_ABBR = {
    "JAN": "january", "FEB": "february", "MAR": "march", "APR": "april",
    "MAY": "may", "JUN": "june", "JUL": "july", "AUG": "august",
    "SEP": "september", "OCT": "october", "NOV": "november", "DEC": "december",
}

# Regex to parse USDA NASS price-file data lines.
LINE_RE = re.compile(r'^\s*(?:(\d{4})\s+)?([A-Za-z]+)\s*\.+:\s*(.+)$')


def nass_get(endpoint, params):
    """Call a Quick Stats API endpoint and return parsed JSON."""
    url = f"{NASS_API_BASE}/{endpoint.lstrip('/')}"
    resp = requests.get(url, params=params, timeout=30)
    resp.raise_for_status()
    payload = resp.json()
    # API can return HTTP 200 with an error payload.
    if isinstance(payload, dict) and "error" in payload:
        err = payload["error"]
        msg = ", ".join(err) if isinstance(err, list) else str(err)
        raise RuntimeError(f"NASS API error: {msg}")
    return payload


def fetch_prices_api(indicator_name, years_back=2):
    """Fetch monthly prices via Quick Stats API.

    Returns a dict mapping year -> {month_name -> value_str, ...}
    """
    if not NASS_API_KEY:
        raise RuntimeError("NASS_API_KEY environment variable not set")

    config = INDICATORS[indicator_name]
    current_year = datetime.now(timezone.utc).year
    start_year = max(current_year - (years_back - 1), 2000)

    params = {
        "key": NASS_API_KEY,
        "year__GE": str(start_year),
        **config["api"],
    }

    counts = nass_get("get_counts/", params)
    count = int(counts.get("count", 0))
    print(f"  API count: {count}")
    if count == 0:
        return {}
    if count > NASS_API_LIMIT:
        raise RuntimeError(
            f"Query exceeds API limit ({count} > {NASS_API_LIMIT}); narrow filters"
        )

    payload = nass_get("api_GET/", {**params, "format": "json"})
    rows = payload.get("data", []) if isinstance(payload, dict) else []

    data = {}
    want_short = config.get("short_desc")
    want_unit = config.get("unit_desc")
    for row in rows:
        if row.get("domain_desc") != "TOTAL":
            continue
        if want_short and row.get("short_desc") != want_short:
            continue
        if want_unit and row.get("unit_desc") != want_unit:
            continue

        year = row.get("year")
        period = (row.get("reference_period_desc") or "").strip().upper()
        begin = str(row.get("begin_code", "")).strip()
        value = row.get("Value")
        if not year or value in (None, "", "(D)", "(S)", "(NA)", "(Z)"):
            continue

        month_name = MONTH_ABBR.get(period)
        if not month_name and begin.isdigit():
            idx = int(begin)
            if 1 <= idx <= 12:
                month_name = MONTHS[idx - 1]
        if not month_name:
            continue

        value_str = str(value).replace(",", "").strip()
        try:
            float(value_str)
        except ValueError:
            continue
        data.setdefault(int(year), {})[month_name] = value_str

    return data


def fetch_prices_txt(url):
    """Fetch a USDA NASS price text file."""
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return resp.text


def parse_prices_txt(text):
    """Parse a USDA NASS price text file.

    Returns a dict mapping year -> {month_name -> value_str, ...}
    """
    data = {}
    current_year = None
    for line in text.splitlines():
        match = LINE_RE.match(line)
        if not match:
            continue

        year_str, month_lower, rest = match.group(1), match.group(2).lower(), match.group(3)
        if month_lower not in MONTHS:
            continue

        numbers = re.findall(r'\d+(?:\.\d+)?', rest)
        if not numbers:
            continue

        value = numbers[0]
        if year_str:
            current_year = int(year_str)
        if current_year is None:
            continue

        data.setdefault(current_year, {})[month_lower] = value

    return data


def detect_decimals(existing_value):
    """Detect the number of decimal places from an existing value string."""
    if existing_value and "." in existing_value:
        return len(existing_value.split(".")[1].rstrip("B").replace(",", ""))
    return 0


def format_value(value_str, existing_values):
    """Format a value string, matching the decimal precision of existing values."""
    num = float(value_str)
    decimals = 0
    for v in existing_values:
        d = detect_decimals(v)
        if d > 0:
            decimals = max(decimals, d)
            break
    if decimals > 0:
        return f"{num:.{decimals}f}"
    if num == int(num):
        return str(int(num))
    return f"{num:.2f}"


def update_indicator(indicator, parsed_data):
    """Update an indicator dict with parsed USDA data.

    Returns a list of human-readable update descriptions.
    """
    if not parsed_data:
        return []

    years = sorted(parsed_data.keys(), reverse=True)
    latest_year = years[0]
    prev_year = years[1] if len(years) > 1 else None

    updates = []
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # -- Latest year: update (or create) the "YYYY" bucket --
    year_key = str(latest_year)
    year_bucket = indicator.get(year_key, {})

    for month in MONTHS:
        source_value = parsed_data[latest_year].get(month)
        if source_value is None:
            continue
        existing = year_bucket.get(month)
        existing_vals = [v for v in year_bucket.values() if v]
        formatted = format_value(source_value, existing_vals)
        if existing is None:
            year_bucket[month] = formatted
            indicator["newMonth"] = True
            updates.append(f"{indicator['name']} ({year_key} {month}): {formatted} (new)")
        elif existing != formatted:
            year_bucket[month] = formatted
            indicator["newMonth"] = False
            updates.append(
                f"{indicator['name']} ({year_key} {month}): {existing} -> {formatted}"
            )
        else:
            # Revision-less re-fetch: no new month, no badge.
            indicator["newMonth"] = False

    if year_bucket:
        indicator[year_key] = year_bucket

    # -- Previous year: update year bucket if present --
    if prev_year is not None:
        prev_key = str(prev_year)
        prev_months = parsed_data[prev_year]
        prev_bucket = indicator.get(prev_key, {})
        for month in MONTHS:
            source_value = prev_months.get(month)
            if source_value is None:
                continue
            existing = prev_bucket.get(month)
            existing_vals = [v for v in prev_bucket.values() if v]
            formatted = format_value(source_value, existing_vals)
            if existing is None:
                prev_bucket[month] = formatted
                indicator["newMonth"] = True
                updates.append(
                    f"{indicator['name']} ({prev_key} {month}): {formatted} (new)"
                )
            elif existing != formatted:
                prev_bucket[month] = formatted
                indicator["newMonth"] = False
                updates.append(
                    f"{indicator['name']} ({prev_key} {month}): {existing} -> {formatted}"
                )
            else:
                indicator["newMonth"] = False
        if prev_bucket:
            indicator[prev_key] = prev_bucket

    if updates:
        indicator["lastUpdated"] = now_iso
    return updates


def fetch_indicator_data(indicator_name):
    """Fetch parsed price data for an indicator, preferring Quick Stats API."""
    config = INDICATORS[indicator_name]

    if NASS_API_KEY:
        try:
            print(f"  Trying Quick Stats API...")
            parsed = fetch_prices_api(indicator_name)
            if parsed:
                years_found = sorted(parsed.keys(), reverse=True)
                print(
                    f"  API: parsed {len(years_found)} years "
                    f"(latest: {years_found[0]}, {len(parsed[years_found[0]])} months)"
                )
                return parsed, "Quick Stats API"
            print("  API returned no usable records; falling back to text source")
        except Exception as e:
            print(f"  API fetch failed ({e}); falling back to text source")
    else:
        print("  NASS_API_KEY not set; using text source fallback")

    text = fetch_prices_txt(config["txt_url"])
    parsed = parse_prices_txt(text)
    if parsed:
        years_found = sorted(parsed.keys(), reverse=True)
        print(
            f"  Text: parsed {len(years_found)} years "
            f"(latest: {years_found[0]}, {len(parsed[years_found[0]])} months)"
        )
    return parsed, "text file"


def update_financials():
    """Main entry point: fetch all USDA NASS indicators and update the JSON."""
    with open(FINANCIALS_PATH, "r") as f:
        data = json.load(f)

    all_updates = []

    for indicator_name in INDICATORS:
        print(f"Fetching {indicator_name}...")

        indicator = None
        for idx in data.get("indices", []):
            if idx.get("name") == indicator_name and idx.get("agency", "").startswith("USDA"):
                indicator = idx
                break

        if not indicator:
            print(f"  Indicator '{indicator_name}' (USDA-sourced) not found in JSON")
            continue

        try:
            parsed_data, source = fetch_indicator_data(indicator_name)
        except Exception as e:
            print(f"  Error fetching {indicator_name}: {e}")
            continue

        if not parsed_data:
            print(f"  No data parsed for {indicator_name}")
            continue

        updates = update_indicator(indicator, parsed_data)
        if updates:
            print(f"  Source: {source}")
        all_updates.extend(updates)

    print(f"\nUpdated {len(all_updates)} values:")
    for u in all_updates:
        print(f"  - {u}")

    if not all_updates:
        print("\nNo USDA data changes; skipping write")
        return

    data["lastUpdated"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    atomic_write_json(FINANCIALS_PATH, data)

    print(f"\nSaved to {FINANCIALS_PATH}")


if __name__ == "__main__":
    update_financials()
