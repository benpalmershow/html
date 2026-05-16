#!/usr/bin/env python3
"""
Fetch a specific SEC 13F-HR filing by CIK + accession number,
collapse duplicate ticker rows (multi-manager-code filings like Berkshire),
and output the site's JSON schema:

  {
    "firms": [ { name, shortName, filingDate, description } ],
    "holdings": [ { ticker, name, value, pct, firm, firmIndex } ]
  }

Usage:
    python get_13f_filing.py
    python get_13f_filing.py --cik 1067983 --accession 0001193125-26-226661
    python get_13f_filing.py --cik 1067983 --accession 0001193125-26-226661 --out my_output.json
    python get_13f_filing.py --top 20          # limit to top N holdings by value
"""

import argparse
import json
import sys
from decimal import Decimal

import pandas as pd
from edgar import set_identity, Company, Filing

# ── Configuration ────────────────────────────────────────────────────────────

# Required by SEC EDGAR fair-access policy
EDGAR_IDENTITY = "benp8400@gmail.com"

# Defaults (Berkshire Hathaway Q1 2026)
DEFAULT_CIK        = "1067983"
DEFAULT_ACCESSION  = "0001193125-26-226661"
DEFAULT_OUT        = "13f_holdings.json"

# ── Helpers ───────────────────────────────────────────────────────────────────

def normalise_accession(raw: str) -> str:
    """Accept '000119312526226661' or '0001193125-26-226661' → canonical dashed form."""
    s = raw.replace("-", "")
    if len(s) != 18:
        raise ValueError(f"Accession number must be 18 digits, got: {raw!r}")
    return f"{s[:10]}-{s[10:12]}-{s[12:]}"


def to_float(val) -> float:
    """Safely coerce Decimal / str / None → float."""
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return 0.0
    if isinstance(val, Decimal):
        return float(val)
    try:
        return float(val)
    except (TypeError, ValueError):
        return 0.0


def collapse_holdings(infotable: pd.DataFrame) -> pd.DataFrame:
    """
    Collapse multiple rows for the same ticker (multi-manager-code filings).
    - Value and shares are summed.
    - Issuer name is taken from the first occurrence.
    - Ticker is taken from the first non-null occurrence.
    Rows with no ticker fall back to CUSIP as the key.
    """
    df = infotable.copy()

    # Normalise column names defensively (edgartools may vary slightly)
    col_map = {}
    for col in df.columns:
        low = col.lower().replace(" ", "").replace("_", "")
        if low in ("issuer", "nameofissuer"):
            col_map[col] = "Issuer"
        elif low in ("ticker",):
            col_map[col] = "Ticker"
        elif low in ("cusip",):
            col_map[col] = "CUSIP"
        elif low in ("value",):
            col_map[col] = "Value"
        elif low in ("sharesprnamount", "shrsorprnamt", "shares"):
            col_map[col] = "Shares"
        elif low in ("type", "shrsorprnamttype"):
            col_map[col] = "Type"
    df = df.rename(columns=col_map)

    # Ensure required columns exist
    for required in ("Issuer", "Value", "Shares"):
        if required not in df.columns:
            df[required] = None

    if "Ticker" not in df.columns:
        df["Ticker"] = None
    if "CUSIP" not in df.columns:
        df["CUSIP"] = None

    # Numeric coercion
    df["Value"]  = df["Value"].apply(to_float)
    df["Shares"] = df["Shares"].apply(to_float)

    # Collapse key: ticker if available, else CUSIP, else issuer name
    def row_key(row):
        t = row.get("Ticker")
        if t and str(t).strip().lower() not in ("nan", "none", ""):
            return str(t).strip().upper()
        c = row.get("CUSIP")
        if c and str(c).strip().lower() not in ("nan", "none", ""):
            return str(c).strip()
        return str(row.get("Issuer", "UNKNOWN")).strip().upper()

    df["_key"] = df.apply(row_key, axis=1)

    # First-occurrence metadata
    first = (
        df.groupby("_key", sort=False)
          .first()
          .reset_index()[["_key", "Issuer", "Ticker", "CUSIP"]]
    )

    # Summed financials
    agg = (
        df.groupby("_key", sort=False)[["Value", "Shares"]]
          .sum()
          .reset_index()
    )

    collapsed = agg.merge(first, on="_key").drop(columns=["_key"])

    # Sort by value descending
    collapsed = collapsed.sort_values("Value", ascending=False).reset_index(drop=True)

    return collapsed


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Fetch a 13F filing and export to site JSON schema.")
    parser.add_argument("--cik",       default=DEFAULT_CIK,       help="SEC CIK (numeric string)")
    parser.add_argument("--accession", default=DEFAULT_ACCESSION,  help="Accession number (dashed or raw 18-digit)")
    parser.add_argument("--out",       default=DEFAULT_OUT,        help="Output JSON file path")
    parser.add_argument("--top",       type=int, default=None,     help="Limit to top N holdings by value")
    args = parser.parse_args()

    set_identity(EDGAR_IDENTITY)

    accession = normalise_accession(args.accession)
    print(f"🔍 Fetching CIK={args.cik}  accession={accession}")

    # ── Fetch company & filing ──────────────────────────────────────────────
    try:
        company = Company(args.cik)
    except Exception as e:
        print(f"❌ Could not load company CIK={args.cik}: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"🏢 Company: {company.name}")

    # Find the specific filing
    filing: Filing | None = None
    try:
        # edgartools: Company.get_filing(accession_number=...)
        filing = company.get_filing(accession_number=accession)
    except Exception:
        pass

    if filing is None:
        # Fallback: search recent 13F-HR filings for this accession
        try:
            filings = company.get_filings(form="13F-HR")
            for f in filings:
                if f.accession_no.replace("-", "") == accession.replace("-", ""):
                    filing = f
                    break
        except Exception as e:
            print(f"❌ Could not search filings: {e}", file=sys.stderr)
            sys.exit(1)

    if filing is None:
        print(f"❌ Filing {accession} not found for CIK {args.cik}", file=sys.stderr)
        sys.exit(1)

    print(f"📄 Filing date : {filing.filing_date}")
    print(f"📄 Form        : {filing.form}")

    # ── Parse 13F ──────────────────────────────────────────────────────────
    try:
        from edgar import ThirteenF
        thirteen_f = ThirteenF(filing)
    except Exception as e:
        print(f"❌ Could not parse 13F: {e}", file=sys.stderr)
        sys.exit(1)

    if not thirteen_f.has_infotable():
        print("❌ This filing has no infotable (holdings data).", file=sys.stderr)
        sys.exit(1)

    infotable = thirteen_f.infotable
    if infotable is None or len(infotable) == 0:
        print("❌ Infotable is empty.", file=sys.stderr)
        sys.exit(1)

    print(f"📊 Raw rows before collapse : {len(infotable)}")

    # ── Collapse duplicate tickers ──────────────────────────────────────────
    collapsed = collapse_holdings(infotable)
    print(f"📊 Unique positions after collapse: {len(collapsed)}")

    total_value = collapsed["Value"].sum()
    print(f"💰 Total value : ${total_value:,.0f}")

    if args.top:
        collapsed = collapsed.head(args.top)
        print(f"✂️  Trimmed to top {args.top} holdings")

    # ── Build firm entry ────────────────────────────────────────────────────
    firm_name       = company.name
    short_name      = firm_name.split()[0] if firm_name else "Unknown"
    filing_date_str = str(filing.filing_date)
    report_period   = str(thirteen_f.report_period) if thirteen_f.report_period else ""

    firm_entry = {
        "name":        firm_name,
        "shortName":   short_name,
        "filingDate":  filing_date_str,
        "description": (
            f"{firm_name} is an investment management firm. "
            f"The holdings shown are based on their most recent 13F filing with the SEC "
            f"(period: {report_period}). "
            f"<a href='https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany"
            f"&CIK={args.cik}&type=13F-HR&dateb=&owner=include&count=10' "
            f"target='_blank' style='color: var(--accent-primary); text-decoration: none;'>"
            f"View SEC filings →</a>"
        ),
    }

    # ── Build holdings entries ──────────────────────────────────────────────
    firm_index = 0   # will be appended at index 0 of the firms array;
                     # caller must adjust if merging into existing JSON

    holdings_entries = []
    for _, row in collapsed.iterrows():
        value = row["Value"]
        pct   = round((value / total_value) * 100, 1) if total_value > 0 else 0.0

        ticker  = str(row.get("Ticker", "") or "").strip()
        issuer  = str(row.get("Issuer",  "") or "").strip()
        cusip   = str(row.get("CUSIP",   "") or "").strip()

        # Fall back gracefully
        if not ticker or ticker.lower() in ("nan", "none"):
            ticker = cusip or "N/A"

        holdings_entries.append({
            "ticker":    ticker,
            "name":      issuer,
            "value":     int(value),
            "pct":       pct,
            "firm":      firm_name,
            "firmIndex": firm_index,
        })

    # ── Assemble output ─────────────────────────────────────────────────────
    output = {
        "firms":    [firm_entry],
        "holdings": holdings_entries,
    }

    with open(args.out, "w") as fh:
        json.dump(output, fh, indent=2)

    print(f"\n✅ Saved {len(holdings_entries)} holdings → {args.out}")
    print(f"   Top 5 positions:")
    for h in holdings_entries[:5]:
        print(f"     {h['ticker']:8s}  ${h['value']:>15,}  {h['pct']:5.1f}%  {h['name']}")


if __name__ == "__main__":
    main()
