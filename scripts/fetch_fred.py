#!/usr/bin/env python3
"""
Fetch economic indicators from FRED API and update financials-data.json.
Requires FRED_API_KEY environment variable.
Get your free key at: https://fred.stlouisfed.org/docs/api/api_key.html
"""

import json
import os
import sys
from datetime import datetime
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
    "Nonfarm Payrolls": "PAYEMS",
    "Average Hourly Earnings": "CES0500000003",
    "Initial Jobless Claims": "ICSA",
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
    "Existing Home Sales": "EXHOSLUSM495S",
    "Case-Shiller Home Price Index": "CSUSHPINSA",
    "30-yr Mortgage Rate": "MORTGAGE30US",
    "Affordability Index": "FMRAA",
    "Oil (WTI)": "DCOILWTICO",
    "Natural Gas": "DHHNGSP",
    "U.S. Petroleum Exports": "PAUELS",
    "Strait of Hormuz Daily Transits": "Hormuz",
}

def fetch_fred_series(series_id, start_date=None):
    url = "https://api.stlouisfed.org/fred/series/observations"
    params = {
        "series_id": series_id,
        "api_key": FRED_API_KEY,
        "file_type": "json",
        "limit": 10,
        "sort_order": "desc",
    }
    if start_date:
        params["observation_start"] = start_date
    
    try:
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
        return resp.json().get("observations", [])
    except Exception as e:
        print(f"Error fetching {series_id}: {e}")
        return []

def get_latest_monthly_value(observations):
    for obs in observations:
        val = obs.get("value")
        if val and val != ".":
            try:
                return float(val)
            except ValueError:
                continue
    return None

def update_financials():
    with open(FINANCIALS_PATH, "r") as f:
        data = json.load(f)
    
    now = datetime.now()
    current_month = now.strftime("%B").lower()
    current_year = str(now.year)
    
    updates = []
    
    for indicator_name, series_id in INDICATOR_MAP.items():
        print(f"Fetching {indicator_name} ({series_id})...")
        observations = fetch_fred_series(series_id)
        value = get_latest_monthly_value(observations)
        
        if value is None:
            print(f"  No data for {indicator_name}")
            continue
        
        found = False
        for idx in data.get("indices", []):
            if idx.get("name") == indicator_name:
                if current_year not in idx:
                    idx[current_year] = {}
                
                if isinstance(idx[current_year], dict):
                    idx[current_year][current_month] = str(round(value, 2))
                else:
                    idx[current_year] = {current_month: str(round(value, 2))}
                
                idx["lastUpdated"] = now.isoformat()
                updates.append(f"{indicator_name}: {value}")
                found = True
                break
        
        if not found:
            print(f"  Indicator '{indicator_name}' not found in financials-data.json")
    
    data["lastUpdated"] = now.isoformat()
    
    with open(FINANCIALS_PATH, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
    
    print(f"\nUpdated {len(updates)} indicators:")
    for u in updates:
        print(f"  - {u}")
    
    print(f"\nSaved to {FINANCIALS_PATH}")

if __name__ == "__main__":
    update_financials()
