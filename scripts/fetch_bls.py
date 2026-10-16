#!/usr/bin/env python3
"""
Fetch economic indicators from the BLS Public Data API and update
financials-data.json.

Requires BLS_API_KEY environment variable.
Get a key at: https://www.bls.gov/developers/

Updates indicators sourced from BLS. PPI is mapped to WPUFD4, the
seasonally adjusted Final Demand Producer Price Index (the BLS source
series for the headline PPI).
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
BLS_API_KEY = os.environ.get("BLS_API_KEY")

if not BLS_API_KEY:
    print("Error: BLS_API_KEY environment variable not set.")
    print("Get a key at https://www.bls.gov/developers/")
    sys.exit(1)

# Indicator name -> BLS series ID.
# PPI is intentionally excluded: it is sourced from FRED (PPIFIS, seasonally
# adjusted) via scripts/fetch_fred.py. BLS WPUFD4 carries a different vintage
# (preliminary) value than FRED PPIFIS, so the BLS workflow must not clobber it.
INDICATOR_MAP = {}

MONTH_MAP = {
    "01": "january", "02": "february", "03": "march", "04": "april",
    "05": "may", "06": "june", "07": "july", "08": "august",
    "09": "september", "10": "october", "11": "november", "12": "december",
}


def fetch_bls_series(series_id, start_year, end_year):
    """Return the BLS observations for a series as a list of dicts."""
    url = "https://api.bls.gov/publicAPI/v2/timeseries/data/"
    payload = {
        "seriesid": [series_id],
        "registrationkey": BLS_API_KEY,
        "startyear": str(start_year),
        "endyear": str(end_year),
    }
    try:
        resp = requests.post(url, json=payload, timeout=30)
        resp.raise_for_status()
    except Exception as e:
        print(f"  Error fetching {series_id}: {e}")
        return []
    data = resp.json()
    if data.get("status") != "REQUEST_SUCCEEDED":
        print(f"  BLS API error for {series_id}: {data.get('message')}")
        return []
    series = data.get("Results", {}).get("series", [])
    if not series:
        return []
    return series[0].get("data", [])


def update_financials():
    with open(FINANCIALS_PATH, "r") as f:
        data = json.load(f)

    now = datetime.now(timezone.utc)
    now_iso = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    this_year = now.year

    updates = []

    for indicator_name, series_id in INDICATOR_MAP.items():
        print(f"Fetching {indicator_name} ({series_id})...")

        observations = fetch_bls_series(series_id, this_year - 1, this_year)
        if not observations:
            print(f"  No data for {indicator_name}")
            continue

        # Rebuild monthly storage as nested year -> month -> value.
        by_year = {}
        for obs in observations:
            val = obs.get("value")
            if not val or val == ".":
                continue
            year = obs.get("year")
            period = obs.get("period", "")
            if not period.startswith("M"):
                continue
            month = MONTH_MAP.get(period[1:])
            if not month or not year:
                continue
            try:
                fval = float(val)
            except ValueError:
                continue
            by_year.setdefault(year, {})[month] = f"{fval:.3f}"

        found = False
        for idx in data.get("indices", []):
            if idx.get("name") == indicator_name:
                # Drop any stale flat month keys (march, april, ...) and
                # replace monthly storage with consistent nested year objects.
                for k in list(idx.keys()):
                    if k in MONTH_MAP.values():
                        del idx[k]
                idx.update(by_year)

                idx["agency"] = "BLS"
                idx["url"] = "https://fred.stlouisfed.org/series/PPIFIS"
                idx["source_url"] = "https://www.bls.gov/news.release/ppi.toc.htm"
                idx["explanation"] = (
                    "Producer Price Index by Commodity: Final Demand, "
                    "seasonally adjusted. The PPI measures the average change "
                    "over time in the selling prices received by domestic "
                    "producers for their output. Sourced from the BLS PPI news "
                    "release (WPUFD4)."
                )
                idx["change"] = ""
                idx["lastUpdated"] = now_iso
                idx["newMonth"] = False
                found = True
                updates.append(
                    f"{indicator_name}: updated from BLS ({series_id})"
                )
                break

        if not found:
            print(f"  Indicator '{indicator_name}' not found in JSON")

    data["lastUpdated"] = now_iso

    with open(FINANCIALS_PATH, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"\nUpdated {len(updates)} indicator(s):")
    for u in updates:
        print(f"  - {u}")
    print(f"\nSaved to {FINANCIALS_PATH}")


if __name__ == "__main__":
    update_financials()
