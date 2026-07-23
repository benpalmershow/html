#!/usr/bin/env python3
"""
Fetch earnings data for configured tickers using yfinance (no API key required)
Writes output to json/earnings.json for downstream consumption.
"""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

import yfinance as yf
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

import os

OUTPUT_FILE = Path(__file__).parent.parent / "json" / "earnings.json"
TICKER_LIST_FILE = Path(__file__).parent.parent / "json" / "earnings-tickers.json"


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


def safe_num(val):
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    return round(float(val), 2)


def safe_millions(val):
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    return int(float(val) / 1_000_000)


def safe_date(val):
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    if isinstance(val, (int, float)):
        try:
            return datetime.fromtimestamp(val, tz=timezone.utc).strftime("%Y-%m-%d")
        except Exception:
            return None
    s = str(val)
    if len(s) >= 10:
        return s[:10]
    return s


def fetch_info_metrics(info):
    info = info or {}
    metrics = {}

    valuation = [
        "marketCap",
        "enterpriseValue",
        "trailingPE",
        "forwardPE",
        "pegRatio",
        "priceToSalesTrailing12Months",
        "priceToBook",
    ]
    for key in valuation:
        metrics[key] = safe_num(info.get(key))

    profitability = [
        "grossMargins",
        "operatingMargins",
        "profitMargins",
        "returnOnAssets",
        "returnOnEquity",
        "revenueGrowth",
        "earningsGrowth",
        "revenuePerShare",
        "freeCashflow",
        "operatingCashflow",
        "grossProfits",
    ]
    for key in profitability:
        metrics[key] = safe_num(info.get(key))

    balance_sheet = [
        "totalCash",
        "totalCashPerShare",
        "totalDebt",
        "totalRevenue",
        "debtToEquity",
        "currentRatio",
        "quickRatio",
        "bookValue",
        "sharesOutstanding",
        "floatShares",
        "impliedSharesOutstanding",
    ]
    for key in balance_sheet:
        metrics[key] = safe_num(info.get(key))

    dividends = [
        "dividendRate",
        "dividendYield",
        "payoutRatio",
        "fiveYearAvgDividendYield",
    ]
    for key in dividends:
        metrics[key] = safe_num(info.get(key))

    analyst = [
        "targetHighPrice",
        "targetLowPrice",
        "targetMeanPrice",
        "targetMedianPrice",
        "recommendationMean",
        "numberOfAnalystOpinions",
    ]
    for key in analyst:
        metrics[key] = safe_num(info.get(key))

    price = [
        "beta",
        "fiftyTwoWeekHigh",
        "fiftyTwoWeekLow",
        "fiftyDayAverage",
        "twoHundredDayAverage",
        "averageVolume",
        "averageDailyVolume10Day",
        "previousClose",
        "open",
        "regularMarketOpen",
        "dayHigh",
        "dayLow",
        "regularMarketDayHigh",
        "regularMarketDayLow",
        "regularMarketVolume",
        "averageVolume10days",
        "sharesShort",
        "sharesShortPreviousMonthDate",
        "sharesShortPriorMonth",
        "dateShortInterest",
    ]
    for key in price:
        metrics[key] = safe_num(info.get(key))

    other = {
        "fullTimeEmployees": safe_num(info.get("fullTimeEmployees")),
        "industry": info.get("industry", ""),
        "currency": info.get("currency", ""),
        "recommendationKey": info.get("recommendationKey", ""),
        "exDividendDate": safe_date(info.get("exDividendDate")),
        "lastDividendDate": safe_date(info.get("lastDividendDate")),
    }
    metrics.update({k: v for k, v in other.items() if v is not None and v != ""})

    return metrics


def fetch_ticker_data(symbol):
    t = yf.Ticker(symbol)
    result = {
        "ticker": symbol,
        "fetchedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "source": "Yahoo Finance",
    }

    # Company metadata
    try:
        info = t.info or {}
        result["company"] = info.get("longName") or info.get("shortName", symbol)
        result["sector"] = info.get("sector", "")
        result["info"] = fetch_info_metrics(info)
    except Exception as e:
        logger.warning(f"{symbol}: metadata fetch failed: {e}")
        result["company"] = symbol

    # Latest price
    try:
        hist = t.history(period="5d")
        if not hist.empty:
            result["latestPrice"] = safe_num(hist["Close"].iloc[-1])
    except Exception as e:
        logger.warning(f"{symbol}: price fetch failed: {e}")

    # Next earnings date
    try:
        dates_df = getattr(t, "earnings_dates", None)
        if dates_df is not None and not dates_df.empty:
            now = pd.Timestamp.now(tz="UTC")
            if getattr(dates_df.index, "tz", None) is None:
                now = now.tz_localize(None)
            future = dates_df[dates_df.index > now]
            if not future.empty:
                next_dt = future.index[0]
                result["nextEarningsDate"] = next_dt.strftime("%Y-%m-%d")

                row = future.iloc[0]
                est = row.get("EPS Estimate")
                rev_est = row.get("Revenue Estimate")
                if est is not None and not pd.isna(est):
                    result["estimatedEPS"] = safe_num(est)
                if rev_est is not None and not pd.isna(rev_est):
                    result["revenueEstimate_M"] = safe_millions(rev_est)
    except Exception as e:
        logger.warning(f"{symbol}: earnings_dates fetch failed: {e}")

    # Recent earnings history (last 4 reported quarters)
    try:
        history = getattr(t, "earnings_dates", None)
        if history is None:
            history = getattr(t, "earnings_history", None)

        if history is not None and not history.empty:
            now = pd.Timestamp.now(tz="UTC")
            if getattr(history.index, "tz", None) is None:
                now = now.tz_localize(None)
            past = history[history.index <= now]
            quarters = []
            for idx, row in past.head(4).iterrows():
                q = {"reportedDate": pd.Timestamp(idx).strftime("%Y-%m-%d")}

                act = row.get("Reported EPS")
                est = row.get("EPS Estimate")
                rev_act = row.get("Reported Revenue")
                rev_est = row.get("Revenue Estimate")
                surprise = row.get("Surprise(%)")

                if act is not None and not pd.isna(act):
                    q["actualEPS"] = safe_num(act)
                if est is not None and not pd.isna(est):
                    q["estimatedEPS"] = safe_num(est)
                if rev_act is not None and not pd.isna(rev_act):
                    q["revenueActual_M"] = safe_millions(rev_act)
                if rev_est is not None and not pd.isna(rev_est):
                    q["revenueEstimate_M"] = safe_millions(rev_est)
                if surprise is not None and not pd.isna(surprise):
                    q["surprisePercent"] = safe_num(surprise)

                # Calculate surprise if missing
                if (
                    q.get("actualEPS") is not None
                    and q.get("estimatedEPS") is not None
                    and "surprisePercent" not in q
                ):
                    e = q["estimatedEPS"]
                    a = q["actualEPS"]
                    if e:
                        q["surprisePercent"] = round(((a - e) / abs(e)) * 100, 1)

                q["source"] = "Yahoo Finance"
                quarters.append(q)

            if quarters:
                result["recentEarnings"] = quarters
    except Exception as e:
        logger.warning(f"{symbol}: earnings history fetch failed: {e}")

    return result


def main():
    logger.info(f"Starting yfinance earnings fetch for {', '.join(TICKERS)}...")
    output = {
        "lastUpdated": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "tickers": TICKERS,
        "earnings": [],
    }

    for symbol in TICKERS:
        try:
            data = fetch_ticker_data(symbol)
            output["earnings"].append(data)
            logger.info(f"  {symbol}: {data.get('company', symbol)}")
        except Exception as e:
            logger.error(f"  {symbol}: fatal error: {e}")
            output["earnings"].append(
                {
                    "ticker": symbol,
                    "error": str(e),
                    "fetchedAt": datetime.now(timezone.utc)
                    .isoformat()
                    .replace("+00:00", "Z"),
                }
            )

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    logger.info(f"Wrote to {OUTPUT_FILE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
