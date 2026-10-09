#!/usr/bin/env python3
"""
Fetch USDA NASS agricultural price data and update financials-data.json.

Fetches monthly commodity price data from USDA NASS text files and updates the
corresponding indicators (Soybeans, Wheat, Beef) in json/financials-data.json.

These URLs are public and do not require an API key or authentication.
Each file uses a fixed-width text format with year-prefixed lines for the first
month of a year and indented month-only lines for subsequent months.

The script updates two locations per indicator:
  - A "YYYY" bucket for the latest year present in the source data
    (used by charts for the current/in-progress year)
  - Top-level month keys for the previous year (legacy fallback data,
    rendered only for months not covered by a year bucket)
"""

import json
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

MONTHS = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
]

# Map indicator name (as stored in financials-data.json) to its USDA NASS URL.
# All three files share the same text format; Beef has extra columns but the
# first column ("All Beef Cattle") is what the JSON tracks.
INDICATOR_URLS = {
    "Soybeans": "https://www.nass.usda.gov/Charts_and_Maps/graphics/data/pricesb.txt",
    "Wheat":    "https://www.nass.usda.gov/Charts_and_Maps/graphics/data/pricewh.txt",
    "Beef":     "https://www.nass.usda.gov/Charts_and_Maps/graphics/data/priceca.txt",
}

# Regex to parse USDA NASS price-file data lines.
# Year-prefixed line:  "2016 January ..:   8.71"
# Month-only line:     "     February .:   8.51"
# The optional 4-digit year at the start indicates the first month of that year;
# subsequent indented month lines belong to the same year until the next year line.
LINE_RE = re.compile(
    r'^\s*(?:(\d{4})\s+)?([A-Za-z]+)\s*\.+:\s*(.+)$'
)


def fetch_prices(url):
    """Fetch a USDA NASS price text file."""
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return resp.text


def parse_prices(text):
    """Parse a USDA NASS price text file.

    Returns a dict mapping year -> {month_name -> value_str, ...}
    where month_name is lowercase (e.g. "january").
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

        # Extract the first numeric value from the remainder.
        # For multi-column files (e.g. Beef), the first column is "All Beef Cattle",
        # which is the aggregate the JSON tracks.
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
    # No existing decimal format – use integer if the value is whole, else 2 dp.
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
            updates.append(f"{indicator['name']} ({year_key} {month}): {formatted} (new)")
        elif existing != formatted:
            year_bucket[month] = formatted
            updates.append(
                f"{indicator['name']} ({year_key} {month}): {existing} -> {formatted}"
            )

    if year_bucket:
        indicator[year_key] = year_bucket

    # -- Previous year: update top-level month keys (legacy fallback) --
    if prev_year is not None:
        prev_months = parsed_data[prev_year]
        flat_existing = [
            indicator.get(m) for m in MONTHS if indicator.get(m)
        ]
        for month in MONTHS:
            source_value = prev_months.get(month)
            if source_value is None:
                continue
            existing = indicator.get(month)
            formatted = format_value(source_value, flat_existing)
            if existing is None:
                indicator[month] = formatted
                updates.append(
                    f"{indicator['name']} ({prev_year} {month}): {formatted} (new)"
                )
            elif existing != formatted:
                indicator[month] = formatted
                updates.append(
                    f"{indicator['name']} ({prev_year} {month}): {existing} -> {formatted}"
                )

    indicator["lastUpdated"] = now_iso
    return updates


def update_financials():
    """Main entry point: fetch all USDA NASS indicators and update the JSON."""
    with open(FINANCIALS_PATH, "r") as f:
        data = json.load(f)

    all_updates = []

    for indicator_name, url in INDICATOR_URLS.items():
        print(f"Fetching {indicator_name} from {url}...")

        indicator = None
        for idx in data.get("indices", []):
            if idx.get("name") == indicator_name and idx.get("agency", "").startswith("USDA"):
                indicator = idx
                break

        if not indicator:
            print(f"  Indicator '{indicator_name}' (USDA-sourced) not found in JSON")
            continue

        try:
            text = fetch_prices(url)
        except Exception as e:
            print(f"  Error fetching {indicator_name}: {e}")
            continue

        parsed_data = parse_prices(text)
        if not parsed_data:
            print(f"  No data parsed for {indicator_name}")
            continue

        years_found = sorted(parsed_data.keys(), reverse=True)
        print(f"  Parsed {len(years_found)} years of data "
              f"(latest: {years_found[0]}, {len(parsed_data[years_found[0]])} months)")

        updates = update_indicator(indicator, parsed_data)
        all_updates.extend(updates)

    data["lastUpdated"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    with open(FINANCIALS_PATH, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")

    print(f"\nUpdated {len(all_updates)} values:")
    for u in all_updates:
        print(f"  - {u}")

    print(f"\nSaved to {FINANCIALS_PATH}")


if __name__ == "__main__":
    update_financials()
