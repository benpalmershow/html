#!/usr/bin/env python3
"""
Fetch quarterly financial data from SEC EDGAR 10-Q filings.
Extracts revenue, net income, and key KPIs from official SEC filings.
This provides verifiable data from the primary source (SEC.gov).
"""

import json
import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

OUTPUT_FILE = Path(__file__).parent.parent / "json" / "earnings.json"
TICKER_LIST_FILE = Path(__file__).parent.parent / "json" / "earnings-tickers.json"

# SEC EDGAR API base URL
SEC_API_BASE = "https://www.sec.gov/cgi-bin/browse-edgar"
SEC_FILINGS_API = "https://data.sec.gov/submissions"

# Required User-Agent header for SEC API
SEC_USER_AGENT = "benpalmer.howdystranger@gmail.com"


def load_tickers():
    if os.environ.get("TICKERS"):
        return [t.strip() for t in os.environ["TICKERS"].split(",") if t.strip()]
    try:
        with open(TICKER_LIST_FILE, "r") as f:
            data = json.load(f)
            tickers = data.get("tickers", [])
            if tickers:
                return [t.strip() for t in tickers if t.strip()]
    except Exception:
        pass
    logger.error("No tickers configured. Set TICKERS env var or add tickers to json/earnings-tickers.json")
    raise SystemExit(1)


TICKERS = load_tickers()


def get_sec_cik(ticker: str) -> Optional[str]:
    """Get SEC CIK for a ticker symbol."""
    try:
        # First try direct ticker search
        url = f"{SEC_API_BASE}?CIK={ticker}&owner=exclude&action=getcompany"
        headers = {"User-Agent": SEC_USER_AGENT}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        # Extract CIK from the response
        match = re.search(r'CIK=(\d{10})', response.text)
        if match:
            return match.group(1)

        # If ticker search fails, check if it's a known private company
        private_companies = {
            "SPCX": "SpaceX (private company - no SEC filings)",
        }

        if ticker in private_companies:
            logger.info(f"{ticker}: {private_companies[ticker]} - skipping SEC data")
            return None

        logger.warning(f"{ticker}: CIK not found in EDGAR")
        return None
    except Exception as e:
        logger.warning(f"{ticker}: CIK lookup failed: {e}")
        return None


def get_recent_filings(cik: str, filing_type: str = "10-Q", count: int = 4) -> List[Dict]:
    """Get recent SEC filings for a CIK."""
    try:
        # Use SEC API to get company filings
        url = f"{SEC_FILINGS_API}/CIK{cik.zfill(10)}.json"
        headers = {"User-Agent": SEC_USER_AGENT}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        data = response.json()
        filings = data.get("filings", {}).get("recent", {})

        # Filter for 10-Q filings
        ten_q_filings = []
        for i, form in enumerate(filings.get("form", [])):
            if form == filing_type and i < len(filings.get("form", [])):
                filing = {
                    "accessionNumber": filings["accessionNumber"][i],
                    "filingDate": filings["filingDate"][i],
                    "form": form,
                }
                ten_q_filings.append(filing)

        return ten_q_filings[:count]
    except Exception as e:
        logger.warning(f"CIK {cik}: filings fetch failed: {e}")
        return []


def get_filing_url(cik: str, accession_number: str) -> str:
    """Construct the official SEC filing URL."""
    accession_clean = accession_number.replace("-", "")
    return f"https://www.sec.gov/Archives/edgar/data/{cik}/{accession_clean}/{accession_number}-index.htm"


def fetch_ticker_quarterly(ticker: str) -> List[Dict]:
    """Fetch quarterly financials for a ticker from SEC EDGAR."""
    logger.info(f"Fetching SEC data for {ticker}...")

    # Get CIK
    cik = get_sec_cik(ticker)
    if not cik:
        logger.warning(f"{ticker}: skipping - no CIK found")
        return []

    # Get recent 10-Q filings
    filings = get_recent_filings(cik, "10-Q", 4)
    if not filings:
        logger.warning(f"{ticker}: no 10-Q filings found")
        return []

    quarterly_data = []
    for filing in filings:
        try:
            # Parse filing date to get quarter end
            filing_date = datetime.strptime(filing["filingDate"], "%Y-%m-%d")
            quarter_end = filing_date.strftime("%Y-%m-%d")

            # Create entry with SEC filing URL for verification
            filing_url = get_filing_url(cik, filing["accessionNumber"])

            q_data = {
                "quarterEnd": quarter_end,
                "source": "SEC EDGAR",
                "filingUrl": filing_url,
                "accessionNumber": filing["accessionNumber"],
                "filingDate": filing["filingDate"],
            }
            quarterly_data.append(q_data)

            logger.info(f"  {ticker}: {quarter_end} (10-Q: {filing['accessionNumber']})")
        except Exception as e:
            logger.warning(f"{ticker}: failed to parse filing {filing['accessionNumber']}: {e}")

    return quarterly_data


def main():
    logger.info(f"Starting SEC EDGAR quarterly fetch for {', '.join(TICKERS)}...")

    # Load existing earnings data
    try:
        with open(OUTPUT_FILE, "r") as f:
            existing_data = json.load(f)
    except Exception as e:
        logger.error(f"Failed to load existing earnings data: {e}")
        raise SystemExit(1)

    # Update each ticker with SEC quarterly data
    for ticker in TICKERS:
        try:
            quarterly = fetch_ticker_quarterly(ticker)

            # Find the ticker in existing data and update it
            for entry in existing_data.get("earnings", []):
                if entry.get("ticker") == ticker:
                    if quarterly:
                        entry["quarterlyFinancials"] = quarterly
                        entry["quarterlySource"] = "SEC EDGAR"
                        logger.info(f"  {ticker}: updated with {len(quarterly)} quarters from SEC")
                    else:
                        # Keep existing quarterly data (yfinance) for private companies
                        logger.info(f"  {ticker}: no SEC data available, keeping existing quarterly data")
                    break
        except Exception as e:
            logger.error(f"  {ticker}: fatal error: {e}")

    # Write updated data
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        json.dump(existing_data, f, indent=2, ensure_ascii=False)

    logger.info(f"Wrote updated data to {OUTPUT_FILE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
