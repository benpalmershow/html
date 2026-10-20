#!/usr/bin/env python3
"""
Fetch 13F holdings from SEC EDGAR into json/13f-holdings.json.

For every firm in the registry the script pulls the two most recent 13F-HR
filings (current period + prior period) and writes:

  * firms[]     - cik, period, previousPeriod, filingDate, lastUpdated
  * holdings[]  - current period positions (ticker, name, value, pct, cusip, ...)
  * previous[]  - prior period snapshot per firm, used for quarter-over-quarter deltas

Tickers are resolved from a persistent CUSIP -> ticker map (json/13f-ticker-map.json).
The map is seeded from the holdings already in the repo (issuer + value fingerprint)
and from SEC's company_tickers.json. Securities that stay unresolved fall back to
their CUSIP, matching the convention already used in the repo for obscure lines.

Usage:
  python3 scripts/fetch_13f.py                 # refresh every firm with a CIK
  python3 scripts/fetch_13f.py --dry-run       # report changes, write nothing
  python3 scripts/fetch_13f.py --firm BERKSHIRE # refresh a single firm
"""

import argparse
import json
import re
import sys
import time
import xml.etree.ElementTree as ElementTree
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

try:
    import requests
except ImportError:
    print("requests is required. Install with: pip install requests")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
HOLDINGS_PATH = ROOT / "json" / "13f-holdings.json"
TICKER_MAP_PATH = ROOT / "json" / "13f-ticker-map.json"

USER_AGENT = (
    "HowdyStranger-13F/1.0 (benjamin.r.palmer@gmail.com)"
)
REQUEST_DELAY = 0.25
ARCHIVES = "https://www.sec.gov/Archives/edgar/data"

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": USER_AGENT, "Accept-Encoding": "gzip, deflate"})


# --------------------------------------------------------------------------
# SEC helpers
# --------------------------------------------------------------------------

def sec_get(url, attempts=3):
    """GET a SEC URL with retries and polite pacing."""
    last_error = None
    for attempt in range(attempts):
        try:
            resp = SESSION.get(url, timeout=60)
            if resp.status_code == 403:
                time.sleep(1.5 * (attempt + 1))
                continue
            resp.raise_for_status()
            time.sleep(REQUEST_DELAY)
            return resp
        except requests.RequestException as exc:
            last_error = exc
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"GET failed: {url} ({last_error})")


def get_filings(cik):
    """Return {period: [(filingDate, accessionNumber, form), ...]} for a filer."""
    url = f"https://data.sec.gov/submissions/CIK{cik:010d}.json"
    data = sec_get(url).json()
    recent = data.get("filings", {}).get("recent", {})
    forms = recent.get("form", [])
    filing_dates = recent.get("filingDate", [])
    report_dates = recent.get("reportDate", [])
    accessions = recent.get("accessionNumber", [])

    by_period = defaultdict(list)
    for form, filing_date, period, accession in zip(
        forms, filing_dates, report_dates, accessions
    ):
        if not form.startswith("13F-HR") or not period:
            continue
        by_period[period].append((filing_date, accession, form))

    for period in by_period:
        # Latest first, so an amendment supersedes the original filing.
        by_period[period].sort(reverse=True)
    return dict(by_period)


def get_information_table(cik, accession):
    """Parse the information table of a filing into aggregated positions."""
    node = accession.replace("-", "")
    index = sec_get(f"{ARCHIVES}/{cik}/{node}/index.json").json()

    candidates = [
        item["name"]
        for item in index.get("directory", {}).get("item", [])
        if item["name"].lower().endswith(".xml")
        and "primary_doc" not in item["name"].lower()
        and not item["name"].lower().startswith("xsl")
    ]

    positions = defaultdict(lambda: {"value": 0, "shares": 0})
    for name in candidates:
        text = sec_get(f"{ARCHIVES}/{cik}/{node}/{name}").text
        if "<infoTable" not in text and ":infoTable" not in text:
            continue
        try:
            root = ElementTree.fromstring(text)
        except ElementTree.ParseError:
            continue
        for row in root.iter():
            if row.tag.split("}")[-1] != "infoTable":
                continue
            fields = {}
            for child in row:
                tag = child.tag.split("}")[-1]
                if tag == "shrsOrPrnAmt":
                    for sub in child:
                        if sub.tag.split("}")[-1] == "sshPrnamt":
                            fields["shares"] = (sub.text or "").strip()
                else:
                    fields[tag] = (child.text or "").strip()
            key = (
                fields.get("nameOfIssuer", ""),
                fields.get("titleOfClass", ""),
                fields.get("cusip", ""),
            )
            positions[key]["value"] += int(fields.get("value") or 0)
            positions[key]["shares"] += int(fields.get("shares") or 0)
        break

    rows = []
    for (issuer, cls, cusip), agg in positions.items():
        rows.append(
            {
                "name": issuer,
                "cls": cls,
                "cusip": cusip,
                "value": agg["value"],
                "shares": agg["shares"],
            }
        )
    rows.sort(key=lambda r: (-r["value"], r["name"]))
    return rows


# --------------------------------------------------------------------------
# Ticker resolution
# --------------------------------------------------------------------------

def normalize_name(name):
    """Reduce an issuer name to comparable tokens."""
    tokens = re.findall(r"[A-Z0-9]+", (name or "").upper())
    skip = {
        "INC", "CORP", "CORPORATION", "CO", "COMPANY", "LTD", "LIMITED", "PLC",
        "LP", "LLC", "L P", "THE", "SA", "AG", "NV", "SE", "GROUP", "HOLDINGS",
        "HOLDING", "COM", "CL", "CLS", "CLASS", "A", "B", "C", "NEW", "SHS",
        "COMMON", "STOCK", "ORD", "SHS", "REGS", "SP", "PLC",
    }
    return [t for t in tokens if t not in skip]


def load_ticker_map():
    if TICKER_MAP_PATH.exists():
        with open(TICKER_MAP_PATH) as handle:
            return json.load(handle)
    return {}


def load_company_tickers():
    """name -> ticker index built from SEC's company_tickers.json."""
    try:
        data = sec_get("https://www.sec.gov/files/company_tickers.json").json()
    except Exception:
        return {}
    index = defaultdict(set)
    for row in data.values():
        title = (row.get("title") or "").upper()
        ticker = row.get("ticker") or ""
        if not title or not ticker:
            continue
        index[tuple(normalize_name(title))].add(ticker)
    return {
        key: next(iter(tickers))
        for key, tickers in index.items()
        if key and len(tickers) == 1
    }


def build_repo_maps(firm_holdings):
    """Lookup tables built from the holdings already stored for a firm."""
    by_cusip = {}
    by_name_value = {}
    by_name = defaultdict(set)
    for holding in firm_holdings:
        ticker = holding.get("ticker")
        if not ticker:
            continue
        cusip = holding.get("cusip")
        if cusip:
            by_cusip[cusip] = ticker
        by_name_value[(holding.get("name"), holding.get("value"))] = ticker
        by_name[holding.get("name")].add(ticker)
    return by_cusip, by_name_value, by_name


def resolve_tickers(rows, repo_maps, ticker_map, company_index):
    """Attach a ticker to every position.

    Order of preference:
      1. CUSIP carried by the holdings already stored for the firm
      2. fingerprint match against those holdings (same issuer name and same
         value means the same security, even across quarters)
      3. issuer name that maps to a single ticker in the stored holdings
      4. persistent CUSIP -> ticker map
      5. SEC company_tickers.json name match
      6. the CUSIP itself, matching the existing repo convention
    """
    by_cusip, by_name_value, by_name = repo_maps
    resolved = {}
    unresolved = []
    for row in rows:
        cusip = row["cusip"]
        ticker = by_cusip.get(cusip)
        if not ticker:
            ticker = by_name_value.get((row["name"], row["value"]))
        if not ticker:
            candidates = by_name.get(row["name"])
            if candidates and len(candidates) == 1:
                ticker = next(iter(candidates))
        if not ticker:
            ticker = ticker_map.get(cusip)
        if not ticker:
            ticker = company_index.get(tuple(normalize_name(row["name"])))
        if not ticker:
            unresolved.append(row)
            ticker = cusip
        resolved[cusip] = ticker

    return resolved, unresolved


def seed_legacy_tickers(firm_holdings, filings, cik, periods, scale=1):
    """Recover tickers for holdings stored before CUSIPs were tracked.

    A stored holding has an issuer name, a value and a ticker but no CUSIP, so
    it is matched against the filings of the two newest periods by name and
    value. That pins the CUSIP of the position, which then carries the ticker
    forward to the refreshed filing.
    """
    legacy = [holding for holding in firm_holdings if not holding.get("cusip")]
    if not legacy:
        return {}, 0

    by_name_value = defaultdict(list)
    for period in periods:
        for _, accession, _form in filings.get(period, [])[:2]:
            try:
                rows = get_information_table(cik, accession)
            except Exception:
                continue
            for row in rows:
                by_name_value[(row["name"], row["value"] * scale)].append(row["cusip"])

    seeded = {}
    for holding in legacy:
        cusips = by_name_value.get((holding["name"], holding["value"]))
        if not cusips:
            continue
        cusip = cusips[0]
        if cusip and ticker_is_usable(holding["ticker"]):
            seeded[cusip] = holding["ticker"]
    return seeded, len(seeded)


def ticker_is_usable(ticker):
    """A CUSIP is not a ticker: it is nine characters and starts with a digit."""
    if not ticker:
        return False
    return not (ticker[0].isdigit() and len(ticker) == 9)


def merge_ticker_maps(*maps):
    """Merge CUSIP -> ticker maps, preferring a real ticker over a CUSIP fallback."""
    merged = {}
    fallbacks = {}
    for mapping in maps:
        for cusip, ticker in mapping.items():
            if ticker == cusip:
                fallbacks.setdefault(cusip, ticker)
            else:
                merged[cusip] = ticker
    for cusip, ticker in fallbacks.items():
        merged.setdefault(cusip, ticker)
    return merged


def detect_scale(rows, by_name_value):
    """Detect whether filing values are in dollars or thousands.

    The same filing can be matched against the holdings already in the repo by
    issuer name and value, which reveals the unit the values are expressed in.
    """
    best_scale, best_hits = 1, -1
    for scale in (1, 1000):
        hits = 0
        for row in rows:
            if (row["name"], row["value"] * scale) in by_name_value:
                hits += 1
        if hits > best_hits:
            best_scale, best_hits = scale, hits
    return best_scale, best_hits


# --------------------------------------------------------------------------
# Registry helpers
# --------------------------------------------------------------------------

def extract_cik(firm):
    if firm.get("cik"):
        try:
            return int(str(firm["cik"]).strip().lstrip("0") or 0)
        except ValueError:
            return None
    match = re.search(r"CIK=(\d+)", firm.get("description", ""))
    if match:
        return int(match.group(1))
    return None


def sec_link(cik):
    return (
        "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK="
        f"{cik}&type=13F-HR&dateb=&owner=include&count=10"
    )


def build_description(name, cik, period):
    return (
        f"{name} is an investment management firm. The holdings shown are based "
        f"on their most recent 13F filing with the SEC (period: {period}). "
        f"<a href='{sec_link(cik)}' target='_blank' style='color: var(--accent-primary); "
        "text-decoration: none;'>View SEC filings \u2192</a>"
    )


def round_pct(value):
    return round(value, 1)


def snapshot(rows, ticker_by_cusip):
    """Turn raw filing rows into the repo's holding shape."""
    total = sum(row["value"] for row in rows)
    holdings = []
    for row in rows:
        ticker = ticker_by_cusip.get(row["cusip"], row["cusip"])
        holdings.append(
            {
                "ticker": ticker,
                "name": row["name"],
                "value": row["value"],
                "pct": round_pct(100 * row["value"] / total) if total else 0.0,
                "firm": None,  # filled in by the caller
                "firmIndex": None,
                "link": f"https://www.perplexity.ai/finance/{ticker}",
                "cusip": row["cusip"],
                "shares": row["shares"],
            }
        )
    return holdings, total


def compact_snapshot(prior_holdings, period, total, keep_cusips):
    """Prior-period snapshot used for deltas, keyed by CUSIP.

    A CUSIP is the stable identifier for a security across quarters, so deltas
    are matched on it rather than on the ticker or the issuer name.

    Only the positions that a card can show are kept: the ones inside the
    current top ranks plus the prior-quarter positions large enough to be
    worth reporting as exits.
    """
    return {
        "period": period,
        "total": total,
        "holdings": {
            holding.get("cusip") or holding["ticker"]: {
                "ticker": holding["ticker"],
                "value": holding["value"],
                "pct": holding["pct"],
                "shares": holding.get("shares", 0),
            }
            for holding in prior_holdings
            if (holding.get("cusip") or holding["ticker"]) in keep_cusips
            or holding["pct"] >= 0.5
        },
    }


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Fetch 13F holdings from SEC EDGAR")
    parser.add_argument("--dry-run", action="store_true", help="report changes without writing")
    parser.add_argument("--firm", action="append", default=[], help="refresh only these firms (by short name)")
    parser.add_argument("--limit", type=int, default=0, help="refresh at most N firms")
    args = parser.parse_args()

    with open(HOLDINGS_PATH) as handle:
        data = json.load(handle)

    firms = data.get("firms", [])
    holdings = data.get("holdings", [])
    previous = data.get("previous", {})

    ticker_map = load_ticker_map()
    company_index = load_company_tickers()
    print(f"Loaded {len(firms)} firms, {len(holdings)} holdings, {len(ticker_map)} cached tickers")

    by_firm = defaultdict(list)
    for holding in holdings:
        by_firm[holding.get("firmIndex")].append(holding)

    updated_firms = []
    new_holdings = []
    new_previous = {}
    learned_tickers = {}
    skipped = []

    targets = firms
    if args.firm:
        wanted = {name.strip().lower() for name in args.firm}
        targets = [
            firm for firm in firms
            if firm.get("shortName", "").lower() in wanted or firm.get("name", "").lower() in wanted
        ]
    if args.limit:
        targets = targets[: args.limit]

    for firm in targets:
        name = firm.get("name")
        cik = extract_cik(firm)
        if not cik:
            skipped.append((name, "no CIK in registry"))
            continue

        try:
            filings = get_filings(cik)
        except Exception as exc:
            print(f"  ! {name}: could not list filings ({exc})")
            skipped.append((name, f"filings unavailable: {exc}"))
            continue

        periods = sorted(filings.keys(), reverse=True)
        if not periods:
            skipped.append((name, "no 13F filings on EDGAR"))
            continue

        current_period = periods[0]
        previous_period = periods[1] if len(periods) > 1 else None
        filing_date, accession, form = filings[current_period][0]

        try:
            rows = get_information_table(cik, accession)
        except Exception as exc:
            print(f"  ! {name}: could not read information table ({exc})")
            skipped.append((name, f"information table unavailable: {exc}"))
            continue
        if not rows:
            skipped.append((name, "information table empty"))
            continue

        firm_holdings = by_firm.get(firm.get("firmIndex"), [])
        repo_maps = build_repo_maps(firm_holdings)
        by_name_value = repo_maps[1]

        prior_rows = []
        if previous_period:
            try:
                prior_rows = get_information_table(cik, filings[previous_period][0][1])
            except Exception as exc:
                print(f"  ! {name}: previous period unavailable ({exc})")

        scale, hits = detect_scale(rows + prior_rows, by_name_value)
        if scale != 1:
            for row in rows + prior_rows:
                row["value"] *= scale
                row["shares"] *= scale

        # Holdings stored before CUSIPs were tracked are matched back to their
        # CUSIP so their tickers carry forward to the refreshed filing.
        legacy_map, legacy_count = seed_legacy_tickers(
            firm_holdings, filings, cik, periods[:2], scale
        )
        if legacy_count:
            ticker_map = merge_ticker_maps(ticker_map, legacy_map)

        # Resolve the prior period first, then reuse that mapping for the
        # current period: a security keeps its CUSIP across quarters, so the
        # ticker learned for last quarter also applies to the position it holds
        # today even when the issuer name or the value changed.
        prior_map = {}
        if prior_rows:
            prior_map, _ = resolve_tickers(
                prior_rows, repo_maps, ticker_map, company_index
            )
        ticker_by_cusip, _ = resolve_tickers(
            rows, repo_maps, merge_ticker_maps(ticker_map, prior_map), company_index
        )
        ticker_by_cusip = merge_ticker_maps(prior_map, ticker_by_cusip)
        prior_map = ticker_by_cusip

        for cusip, ticker in ticker_by_cusip.items():
            if ticker != cusip and cusip not in ticker_map:
                learned_tickers[cusip] = ticker

        current_holdings, current_total = snapshot(rows, ticker_by_cusip)

        # Guard against a bad or partial response overwriting good data.
        old_total = sum(holding["value"] for holding in firm_holdings)
        old_period = firm.get("period")
        if len(firm_holdings) >= 20 and len(current_holdings) < len(firm_holdings) * 0.5:
            print(f"  ! {name}: refusing update, {len(current_holdings)} positions vs {len(firm_holdings)} stored")
            skipped.append((name, "position count dropped more than half"))
            continue
        if old_period == current_period and old_total and abs(current_total - old_total) / old_total > 0.25:
            print(f"  ! {name}: refusing update, total moved from ${old_total:,} to ${current_total:,} for the same period")
            skipped.append((name, "total changed more than 25% for the same period"))
            continue

        prior_holdings = []
        prior_total = 0
        if prior_rows:
            prior_holdings, prior_total = snapshot(prior_rows, prior_map)

        firm_index = firm.get("firmIndex")
        for holding in current_holdings:
            holding["firm"] = name
            holding["firmIndex"] = firm_index

        updated_firms.append(
            {
                "name": name,
                "cik": cik,
                "period": current_period,
                "previousPeriod": previous_period,
                "filingDate": filing_date,
                "lastUpdated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            }
        )
        new_holdings.extend(current_holdings)
        if prior_holdings:
            keep_cusips = {
                holding.get("cusip") or holding["ticker"]
                for holding in current_holdings[:200]
            }
            new_previous[name] = compact_snapshot(
                prior_holdings, previous_period, prior_total, keep_cusips
            )

        unresolved_current = sum(
            1 for row in rows if ticker_by_cusip.get(row["cusip"]) == row["cusip"]
        )

        print(
            f"  {name}: period {current_period} (filed {filing_date}, {form}) "
            f"{len(current_holdings)} positions, ${current_total:,}"
            + (f" | prior {previous_period}: ${prior_total:,}" if prior_holdings else "")
            + (f" | {unresolved_current} unresolved tickers" if unresolved_current else "")
            + (f" | {hits} fingerprint matches" if hits else "")
        )

    print(f"\nRefreshed {len(updated_firms)} firms, skipped {len(skipped)}")
    for name, reason in skipped:
        print(f"  - {name}: {reason}")

    if args.dry_run:
        print("\nDry run: no files written")
        return

    # Rebuild the holdings array: refreshed firms first, untouched firms keep their rows.
    refreshed_indices = {entry["name"] for entry in updated_firms}
    kept = [holding for holding in holdings if holding.get("firm") not in refreshed_indices]
    merged = kept + new_holdings
    merged.sort(key=lambda h: (h.get("firmIndex", 0), -h.get("value", 0)))
    data["holdings"] = merged

    for entry in updated_firms:
        for firm in firms:
            if firm.get("name") != entry["name"]:
                continue
            firm["cik"] = entry["cik"]
            firm["period"] = entry["period"]
            firm["previousPeriod"] = entry["previousPeriod"]
            firm["filingDate"] = entry["filingDate"]
            firm["lastUpdated"] = entry["lastUpdated"]
            firm["description"] = build_description(
                firm["name"], entry["cik"], entry["period"]
            )

    previous.update(new_previous)
    data["previous"] = previous
    data["lastUpdated"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    with open(HOLDINGS_PATH, "w") as handle:
        json.dump(data, handle, indent=2)
        handle.write("\n")
    print(f"Saved {HOLDINGS_PATH} ({len(merged)} holdings, {len(previous)} prior snapshots)")

    if learned_tickers:
        ticker_map.update(learned_tickers)
        with open(TICKER_MAP_PATH, "w") as handle:
            json.dump(ticker_map, handle, indent=2, sort_keys=True)
            handle.write("\n")
        print(f"Saved {TICKER_MAP_PATH} ({len(learned_tickers)} new tickers)")


if __name__ == "__main__":
    main()
