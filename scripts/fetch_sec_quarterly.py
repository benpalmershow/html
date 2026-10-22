#!/usr/bin/env python3
"""
Fetch quarterly financial data from SEC EDGAR 10-Q filings.
Extracts revenue, net income, and key KPIs from official SEC filings.
This provides verifiable data from the primary source (SEC.gov).
"""

import calendar
import json
import logging
import os
import re
from datetime import date, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import requests

from sec_exhibit import parse_exhibit_991

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

OUTPUT_FILE = Path(__file__).parent.parent / "json" / "earnings.json"
TICKER_LIST_FILE = Path(__file__).parent.parent / "json" / "earnings-tickers.json"

# SEC EDGAR API base URL
SEC_API_BASE = "https://www.sec.gov/cgi-bin/browse-edgar"
SEC_FILINGS_API = "https://data.sec.gov/submissions"
SEC_TICKER_MAP_URL = "https://www.sec.gov/files/company_tickers.json"
SEC_XBRL_API = "https://data.sec.gov/api/xbrl/companyfacts"

# Required User-Agent header for SEC API
SEC_USER_AGENT = "benpalmer.howdystranger@gmail.com"

# Tickers with no SEC filings because they are not SEC registrants.
# SpaceX (SPCX) used to be here; it IPO'd on Nasdaq in June 2026 (CIK 0001181412).
PRIVATE_COMPANIES: Dict[str, str] = {}

# XBRL tags used for each quarterly metric, in order of preference
XBRL_METRICS: Dict[str, List[str]] = {
    "totalRevenue": [
        "Revenues",
        "RevenueFromContractWithCustomerExcludingAssessedTax",
        "RevenueFromContractWithCustomerIncludingAssessedTax",
        "SalesRevenueNet",
    ],
    "netIncome": ["NetIncomeLoss", "ProfitLoss"],
    "grossProfit": ["GrossProfit"],
    "operatingIncome": ["OperatingIncomeLoss"],
    "rdExpense": ["ResearchAndDevelopmentExpense"],
    "sgaExpense": [
        "SellingGeneralAndAdministrativeExpense",
        "GeneralAndAdministrativeExpense",
    ],
}


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

_TICKER_CIK_MAP: Optional[Dict[str, str]] = None
_COMPANY_FACTS: Dict[str, Dict] = {}


def load_sec_ticker_map() -> Dict[str, str]:
    """Fetch the SEC ticker -> CIK map for every SEC registrant (cached per run)."""
    global _TICKER_CIK_MAP
    if _TICKER_CIK_MAP is not None:
        return _TICKER_CIK_MAP

    mapping: Dict[str, str] = {}
    try:
        response = requests.get(
            SEC_TICKER_MAP_URL, headers={"User-Agent": SEC_USER_AGENT}, timeout=15
        )
        response.raise_for_status()
        for record in response.json().values():
            ticker = str(record.get("ticker", "")).upper()
            cik = record.get("cik_str")
            if ticker and cik is not None:
                mapping[ticker] = str(cik).zfill(10)
        logger.info(f"Loaded SEC ticker map ({len(mapping)} tickers)")
    except Exception as e:
        logger.warning(f"Ticker map fetch failed: {e}")

    _TICKER_CIK_MAP = mapping
    return mapping


def get_sec_cik(ticker: str) -> Optional[str]:
    """Get SEC CIK for a ticker symbol."""
    ticker = ticker.upper()

    # The SEC ticker map covers every registrant, including recent IPOs that the
    # browse-edgar ticker lookup does not resolve (e.g. SpaceX / SPCX).
    cik = load_sec_ticker_map().get(ticker)
    if cik:
        return cik

    try:
        # Fallback: direct ticker search
        url = f"{SEC_API_BASE}?CIK={ticker}&owner=exclude&action=getcompany"
        headers = {"User-Agent": SEC_USER_AGENT}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        # Extract CIK from the response
        match = re.search(r'CIK=(\d{10})', response.text)
        if match:
            return match.group(1)
    except Exception as e:
        logger.warning(f"{ticker}: CIK lookup failed: {e}")

    if ticker in PRIVATE_COMPANIES:
        logger.info(f"{ticker}: {PRIVATE_COMPANIES[ticker]} - skipping SEC data")
        return None

    logger.warning(f"{ticker}: CIK not found in EDGAR")
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

        forms = filings.get("form", [])
        report_dates = filings.get("reportDate", [])
        items_list = filings.get("items", [])

        # Filter for the requested filing type
        matches = []
        for i, form in enumerate(forms):
            if form != filing_type:
                continue
            matches.append(
                {
                    "accessionNumber": filings["accessionNumber"][i],
                    "filingDate": filings["filingDate"][i],
                    "reportDate": report_dates[i] if i < len(report_dates) else "",
                    "form": form,
                    "items": items_list[i] if i < len(items_list) else "",
                }
            )

        return matches[:count]
    except Exception as e:
        logger.warning(f"CIK {cik}: filings fetch failed: {e}")
        return []


def get_filing_url(cik: str, accession_number: str) -> str:
    """Construct the official SEC filing URL."""
    accession_clean = accession_number.replace("-", "")
    # EDGAR archive paths use the CIK without leading zeros
    cik_path = str(int(cik)) if str(cik).isdigit() else str(cik)
    return f"https://www.sec.gov/Archives/edgar/data/{cik_path}/{accession_clean}/{accession_number}-index.htm"


def get_document_url(cik: str, accession_number: str, document: str) -> str:
    """Construct the URL of a document inside a filing."""
    accession_clean = accession_number.replace("-", "")
    cik_path = str(int(cik)) if str(cik).isdigit() else str(cik)
    return f"https://www.sec.gov/Archives/edgar/data/{cik_path}/{accession_clean}/{document}"


def fetch_document(cik: str, accession_number: str, document: str) -> Optional[str]:
    url = get_document_url(cik, accession_number, document)
    try:
        response = requests.get(url, headers={"User-Agent": SEC_USER_AGENT}, timeout=30)
        response.raise_for_status()
        return response.text
    except Exception as e:
        logger.warning(f"CIK {cik}: document fetch failed for {document}: {e}")
        return None


def find_exhibit_991(cik: str, accession_number: str) -> Optional[str]:
    """Find the Exhibit 99.1 document name of a filing."""
    accession_clean = accession_number.replace("-", "")
    cik_path = str(int(cik)) if str(cik).isdigit() else str(cik)
    base = f"https://www.sec.gov/Archives/edgar/data/{cik_path}/{accession_clean}"

    try:
        response = requests.get(
            f"{base}/{accession_number}.txt", headers={"User-Agent": SEC_USER_AGENT}, timeout=30
        )
        response.raise_for_status()
        documents = re.findall(
            r"<TYPE>([^<\n]+)[\s\S]*?<FILENAME>([^<\n]+)",
            response.text,
        )
        for doc_type, filename in documents:
            if doc_type.strip().upper() in {"EX-99.1", "EX99.1", "EXHIBIT 99.1"}:
                return filename.strip()
    except Exception as e:
        logger.warning(f"CIK {cik}: submission text fetch failed: {e}")

    try:
        response = requests.get(
            f"{base}/index.json", headers={"User-Agent": SEC_USER_AGENT}, timeout=30
        )
        response.raise_for_status()
        for item in response.json().get("directory", {}).get("item", []):
            name = item.get("name", "")
            lowered = name.lower()
            if lowered.endswith((".htm", ".html")) and re.search(r"ex(hibit)?[-_]?99[-_.]?1", lowered):
                return name
    except Exception as e:
        logger.warning(f"CIK {cik}: index fetch failed: {e}")

    return None


def fetch_company_facts(cik: str) -> Dict:
    """Fetch the XBRL company facts for a CIK (cached per run)."""
    global _COMPANY_FACTS
    if cik in _COMPANY_FACTS:
        return _COMPANY_FACTS[cik]

    url = f"{SEC_XBRL_API}/CIK{cik.zfill(10)}.json"
    try:
        response = requests.get(url, headers={"User-Agent": SEC_USER_AGENT}, timeout=45)
        response.raise_for_status()
        _COMPANY_FACTS[cik] = response.json()
    except Exception as e:
        logger.warning(f"CIK {cik}: companyfacts fetch failed: {e}")
        _COMPANY_FACTS[cik] = {}

    return _COMPANY_FACTS[cik]


def duration_days(start: str, end: str) -> int:
    return (date.fromisoformat(end) - date.fromisoformat(start)).days


def discrete_quarter_amounts(facts: Dict) -> Dict[str, Dict[str, float]]:
    """Build {period end: {metric: value}} of discrete quarterly amounts from XBRL facts.

    Filings often tag a quarter directly and also year-to-date figures, so the
    quarter is taken from the tagged value when it exists and otherwise derived
    by differencing the year-to-date series of the same fiscal year.
    """
    us_gaap = facts.get("facts", {}).get("us-gaap", {})
    amounts: Dict[str, Dict[str, float]] = {}

    for metric, tags in XBRL_METRICS.items():
        assigned: Dict[str, float] = {}
        for tag in tags:
            node = us_gaap.get(tag)
            if not node:
                continue

            # Keep the most recently filed value for every period
            periods: Dict[Tuple[str, str], Dict] = {}
            for unit, items in node.get("units", {}).items():
                if unit != "USD":
                    continue
                for item in items:
                    start, end = item.get("start"), item.get("end")
                    if not start or not end:
                        continue
                    if item.get("form") not in {"10-Q", "10-K"}:
                        continue
                    try:
                        days = duration_days(start, end)
                    except ValueError:
                        continue
                    if days > 400:
                        continue
                    key = (start, end)
                    current = periods.get(key)
                    if current is None or item.get("filed", "") > current["filed"]:
                        periods[key] = {
                            "value": float(item["val"]),
                            "days": days,
                            "filed": item.get("filed", ""),
                        }

            if not periods:
                continue

            quarters: Dict[str, float] = {}
            series: Dict[str, List[Tuple[int, str, float]]] = {}
            for (start, end), item in periods.items():
                if 80 <= item["days"] <= 100:
                    quarters.setdefault(end, item["value"])
                series.setdefault(start, []).append((item["days"], end, item["value"]))

            # Difference the year-to-date series of each fiscal year
            for points in series.values():
                points.sort()
                previous = None
                for days, end, value in points:
                    if previous is None:
                        if 80 <= days <= 100:
                            previous = value
                        continue
                    quarters.setdefault(end, value - previous)
                    previous = value

            if not quarters:
                continue

            # Earlier tags win, later tags only fill gaps
            for end, value in quarters.items():
                assigned.setdefault(end, value)

        for end, value in assigned.items():
            amounts.setdefault(end, {})[metric] = value

    return amounts


def resolve_period_end(
    exhibit: Dict, latest_period_end: str
) -> Optional[str]:
    """Resolve the quarter an Exhibit 99.1 release covers."""
    if exhibit.get("periodEnd"):
        return exhibit["periodEnd"]

    label = exhibit.get("periodLabel")
    if label:
        match = re.match(r"^Q([1-4])[-– ]*(?:FY)?(\d{2,4})$", label, re.I)
        if match:
            quarter = int(match.group(1))
            year = int(match.group(2))
            if year < 100:
                year += 2000
            month = quarter * 3
            last_day = calendar.monthrange(year, month)[1]
            return f"{year:04d}-{month:02d}-{last_day:02d}"

    if latest_period_end:
        # Next quarter ends roughly three months after the last filed quarter
        base = date.fromisoformat(latest_period_end) + timedelta(days=91)
        for candidate_month_end in (
            date(base.year, base.month, calendar.monthrange(base.year, base.month)[1]),
            date(base.year, base.month, 1) - timedelta(days=1),
        ):
            if abs((candidate_month_end - base).days) <= 3:
                return candidate_month_end.isoformat()
        return base.isoformat()

    return None


def fetch_8k_quarter(
    cik: str, latest_period_end: str, latest_filing_date: str
) -> Optional[Dict]:
    """Find an 8-K earnings release that covers a quarter newer than the last 10-Q."""
    for filing in get_recent_filings(cik, "8-K", 8):
        if filing["filingDate"] <= latest_filing_date:
            break

        # Item 2.02 is the official SEC item for quarterly financial results
        items = filing.get("items", "")
        if items and "2.02" not in str(items):
            logger.info(f"  CIK {cik}: 8-K {filing['accessionNumber']} items {items} does not include 2.02 (Earnings Release)")
            continue

        document = find_exhibit_991(cik, filing["accessionNumber"])
        if not document:
            logger.info(f"  CIK {cik}: 8-K {filing['accessionNumber']} has no Exhibit 99.1")
            continue

        html = fetch_document(cik, filing["accessionNumber"], document)
        if not html:
            continue

        exhibit = parse_exhibit_991(html)
        if not exhibit:
            logger.info(f"  CIK {cik}: 8-K {filing['accessionNumber']} exhibit has no financial statements")
            continue

        if not exhibit.get("isEarningsRelease"):
            logger.info(f"  CIK {cik}: 8-K {filing['accessionNumber']} exhibit is not an earnings release")
            continue

        period_end = resolve_period_end(exhibit, latest_period_end)
        if not period_end or period_end <= latest_period_end:
            logger.info(f"  CIK {cik}: 8-K {filing['accessionNumber']} covers {period_end}, not newer than {latest_period_end}")
            continue

        if period_end > filing["filingDate"] and (
            date.fromisoformat(period_end) - date.fromisoformat(filing["filingDate"])
        ).days > 7:
            logger.info(f"  CIK {cik}: 8-K {filing['accessionNumber']} period {period_end} is in the future")
            continue

        amounts = exhibit["amounts"]
        if "totalRevenue" not in amounts:
            continue

        entry = build_filing_entry(cik, filing)
        entry["quarterEnd"] = period_end
        entry["exhibitUrl"] = get_document_url(cik, filing["accessionNumber"], document)
        entry.update(amounts)
        logger.info(
            f"  CIK {cik}: 8-K {filing['accessionNumber']} covers {period_end} "
            f"(revenue ${amounts['totalRevenue'] / 1e9:.2f}B)"
        )
        return entry

    return None


def build_filing_entry(cik: str, filing: Dict) -> Dict:
    """Build a quarterly row for a SEC filing."""
    # The period end is the reported period, not the filing date
    quarter_end = filing.get("reportDate") or filing["filingDate"]

    return {
        "quarterEnd": quarter_end,
        "source": "SEC EDGAR",
        "filingUrl": get_filing_url(cik, filing["accessionNumber"]),
        "accessionNumber": filing["accessionNumber"],
        "filingDate": filing["filingDate"],
        "form": filing.get("form", ""),
    }


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
        # Registrants without a 10-Q (e.g. recent IPOs) still file an annual 10-K
        filings = get_recent_filings(cik, "10-K", 4)
    if not filings:
        logger.warning(f"{ticker}: no 10-Q or 10-K filings found")
        return []

    quarterly_data = [build_filing_entry(cik, filing) for filing in filings]

    # Amounts for the filed quarters come from the XBRL company facts
    facts = fetch_company_facts(cik)
    amounts = discrete_quarter_amounts(facts)
    for q_data in quarterly_data:
        quarter_amounts = amounts.get(q_data["quarterEnd"])
        if quarter_amounts:
            q_data.update(quarter_amounts)

    # An 8-K earnings release covers the newest quarter before its 10-Q is filed
    latest_period_end = quarterly_data[0]["quarterEnd"]
    latest_filing_date = quarterly_data[0]["filingDate"]
    eight_k = fetch_8k_quarter(cik, latest_period_end, latest_filing_date)
    if eight_k:
        quarterly_data.insert(0, eight_k)

    for q_data in quarterly_data:
        revenue = q_data.get("totalRevenue")
        logger.info(
            f"  {ticker}: {q_data['quarterEnd']} ({q_data['form']}: {q_data['accessionNumber']})"
            + (f" revenue ${revenue / 1e9:.2f}B" if revenue else "")
        )

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
