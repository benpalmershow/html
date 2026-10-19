#!/usr/bin/env python3
"""
Fetch indicators from sources without a dedicated workflow.

Uses a per-source registry (SOURCE_REGISTRY) keyed by indicator id. Each entry
declares the source type (polymarket or kalshi), the API identifier (slug or
ticker), and a mapping from API outcome names to the indicator's JSON field
names. Fetchers write into json/financials-data.json following the same
conventions as the other fetch scripts:

  - probabilities[YYYY-MM-DD] = {outcome_field: "XX\u00a2", ...}
    Binary yes/no markets use the canonical keys "yes"/"no"; other market
    shapes use their own keys (e.g. "Democratic Party", "rate_hold_odds",
    "PIT_win_odds").
  - top-level odds fields (yes_odds, no_odds, rate_hold_odds, ...)
  - lastUpdated timestamp

Implemented sources:
  - Polymarket (public gamma API, no key): https://gamma-api.polymarket.com/events?slug=<slug>
  - Kalshi (public trade API, no key): https://api.elections.kalshi.com/trade/api/v2/markets/<ticker>

Unimplemented sources (NAR, Freightos, Zillow, Port of LA/Long Beach, Chicago
Fed, EIA, CME, USCIS, CBP, Manheim, Windward, NAHB, Conference Board, ADP,
Challenger Gray, ISM, S&P Global, Robotaxi Tracker, USDA Urea) are listed in
SOURCE_REGISTRY with ``implemented: False`` and a ``note`` explaining what is
needed to wire them up. They are skipped by the fetcher with a clear message.

Usage:
    python3 scripts/fetch_other_indicators.py [--dry-run]
"""

import json
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

# Polymarket gamma API (public, no key required).
POLYMARKET_GAMMA_BASE = "https://gamma-api.polymarket.com/events"

# Kalshi public trade API (public, no key required for market quotes).
KALSHI_API_BASE = "https://www.kalshi.com/trade/api/v2/markets"

CENT = "\u00a2"


def _parse_json_list(value):
    """Parse Polymarket's JSON-encoded string list fields, e.g.
    outcomes='[\"Yes\", \"No\"]' or outcomePrices='[\"0.065\", \"0.935\"]'.
    Passes through real lists unchanged."""
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return parsed
        except (ValueError, TypeError):
            pass
    return []


def price_to_cents(value):
    """Convert a decimal price (0.20) or cents number (20) to "20\u00a2"."""
    try:
        v = float(value)
    except (TypeError, ValueError):
        return None
    # If value is already >= 1, treat as cents; otherwise convert decimal -> cents.
    cents = v if v >= 1 else v * 100
    return f"{int(round(cents))}{CENT}"


def todays_date_key():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def fetch_polymarket(slug, market_configs, max_retries=3):
    """Fetch a Polymarket event and return {field_name: price_str, ...} plus updatedAt.

    Each entry in ``market_configs`` is a dict with:
      - question_contains: substring to match in the market question (optional)
      - outcome_map: mapping from Polymarket outcome name -> indicator field name
    """
    import urllib.parse
    url = f"{POLYMARKET_GAMMA_BASE}?slug={urllib.parse.quote(slug)}"
    for attempt in range(max_retries):
        try:
            resp = requests.get(url, headers={"User-Agent": "howdy-stranger/1.0"}, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            break
        except Exception as e:
            if attempt == max_retries - 1:
                print(f"  Polymarket API error for slug {slug}: {e}")
                return None
            import time
            time.sleep(2 ** attempt)
    else:
        return None

    events = data if isinstance(data, list) else data.get("events", [])
    if not events:
        print(f"  No Polymarket event for slug {slug}")
        return None

    event = events[0]
    updated_at = event.get("updatedAt") or datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    outcomes = {}
    for market in event.get("markets") or []:
        question = market.get("question") or ""
        for cfg in market_configs:
            qc = cfg.get("question_contains")
            if qc and qc.lower() not in question.lower():
                continue
            market_outcomes = _parse_json_list(market.get("outcomes"))
            market_prices = _parse_json_list(market.get("outcomePrices"))
            if len(market_outcomes) != len(market_prices):
                continue
            for name, price in zip(market_outcomes, market_prices):
                field = cfg["outcome_map"].get(name)
                if not field:
                    continue
                formatted = price_to_cents(price)
                if formatted is not None:
                    outcomes[field] = formatted
    return {"outcomes": outcomes, "updatedAt": updated_at}


def fetch_kalshi(ticker, max_retries=3):
    """Fetch a Kalshi market and return {outcome_name: price_str, ...} plus updatedAt."""
    url = f"{KALSHI_API_BASE}/{ticker}"
    for attempt in range(max_retries):
        try:
            resp = requests.get(url, headers={"User-Agent": "howdy-stranger/1.0"}, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            break
        except Exception as e:
            if attempt == max_retries - 1:
                print(f"  Kalshi API error for ticker {ticker}: {e}")
                return None
            import time
            time.sleep(2 ** attempt)
    else:
        return None

    market = data.get("market") or data
    # Kalshi may return "yes_bid"/"no_bid" or a list of outcomes with prices.
    outcomes = {}
    updated_at = market.get("last_updated") or market.get("updatedAt") or datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    # Try the outcomes list first (newer API shape).
    for outcome in market.get("outcomes") or []:
        name = outcome.get("name") or outcome.get("outcome")
        price = outcome.get("price") or outcome.get("last_price") or outcome.get("bid")
        if name and price is not None:
            outcomes[name] = price_to_cents(price)

    # Fallback: yes/no bid fields.
    if not outcomes:
        yes_bid = market.get("yes_bid")
        no_bid = market.get("no_bid")
        if yes_bid is not None:
            outcomes["Yes"] = price_to_cents(yes_bid)
        if no_bid is not None:
            outcomes["No"] = price_to_cents(no_bid)

    if not outcomes:
        print(f"  No parseable outcomes for Kalshi ticker {ticker}")
        return None

    return {"outcomes": outcomes, "updatedAt": updated_at}


# ---------------------------------------------------------------------------
# Indicator registry. Each entry maps an indicator id to its fetch config.
# ---------------------------------------------------------------------------
#
# Fields:
#   id           - indicator "id" in financials-data.json
#   agency       - indicator "agency" (used to confirm the match)
#   source       - "polymarket" or "kalshi"
#   api_id       - Polymarket event slug or Kalshi market ticker
#   outcome_map  - dict mapping API outcome name -> snapshot key used in
#                  "probabilities" (e.g. {"Yes": "yes", "No": "no"}). If omitted,
#                  only the "probabilities" time-series is updated.
#   top_level_map- dict mapping snapshot key -> list of top-level indicator
#                  fields that mirror the current odds (e.g.
#                  {"yes": ["yes_odds", "yes_probability"]}). If omitted, the
#                  top-level field name matches the snapshot key.
#   implemented  - False means the source/API is not yet wired; skipped with a note.
#   note         - human-readable note about what is needed to implement.
SOURCE_REGISTRY = {
    # --- Polymarket prediction markets (implemented via gamma API) ---
    "strait-of-hormuz-traffic": {
        "agency": "Polymarket",
        "source": "polymarket",
        "api_id": "strait-of-hormuz-traffic-returns-to-normal-by-december-31",
        "market_configs": [
            {"question_contains": "Strait of Hormuz", "outcome_map": {"Yes": "yes", "No": "no"}},
        ],
        "top_level_map": {"yes": ["yes_odds", "yes_probability"], "no": ["no_odds", "no_probability"]},
        "implemented": True,
    },
    "iranian-regime-fall-2026": {
        "agency": "Polymarket",
        "source": "polymarket",
        "api_id": "will-the-iranian-regime-fall-by-the-end-of-2026",
        "market_configs": [
            {"question_contains": "Iranian regime", "outcome_map": {"Yes": "yes", "No": "no"}},
        ],
        "top_level_map": {"yes": ["yes_odds", "yes_probability"], "no": ["no_odds", "no_probability"]},
        "implemented": True,
    },
    "us-recession-2026": {
        "agency": "Polymarket",
        "source": "polymarket",
        "api_id": "us-recession-by-end-of-2026",
        "market_configs": [
            {"question_contains": "US recession", "outcome_map": {"Yes": "yes", "No": "no"}},
        ],
        "top_level_map": {"yes": ["yes_odds", "yes_probability"], "no": ["no_odds", "no_probability"]},
        "implemented": True,
    },
    "midterms-senate-2026": {
        "agency": "Polymarket",
        "source": "polymarket",
        "api_id": "which-party-will-win-the-senate-in-2026",
        "market_configs": [
            {"question_contains": "Democratic Party control the Senate", "outcome_map": {"Yes": "Democratic Party", "No": "Republican Party"}},
        ],
        "implemented": True,
    },
    "midterms-house-2026": {
        "agency": "Polymarket",
        "source": "polymarket",
        "api_id": "which-party-will-win-the-house-in-2026",
        "market_configs": [
            {"question_contains": "Democratic Party control the House", "outcome_map": {"Yes": "Democratic Party", "No": "Republican Party"}},
        ],
        "implemented": True,
    },
    # --- Polymarket prediction markets (implemented via gamma API) ---
    # FOMC switched from Kalshi to Polymarket: Kalshi's public API returns a
    # Cloudflare challenge (429) for unauthenticated requests and cannot be
    # polled from GitHub Actions. Polymarket's gamma API is public and works.
    "fomc-rate-decision-october-2026": {
        "agency": "Polymarket",
        "source": "polymarket",
        "api_id": "fed-decision-in-october-20260617190323537",
        "market_configs": [
            {"question_contains": "decrease interest rates by 25 bps", "outcome_map": {"Yes": "rate_cut_odds"}},
            {"question_contains": "no change in Fed interest rates", "outcome_map": {"Yes": "rate_hold_odds"}},
            {"question_contains": "increase interest rates by 25 bps", "outcome_map": {"Yes": "rate_hike_odds"}},
        ],
        "implemented": True,
    },
    # Trump impeachment: no equivalent Polymarket market found after searching
    # common slugs. Kept unimplemented; verify odds manually from the Kalshi URL
    # per docs/financial_fetch.md if a Polymarket market is later identified.
    "trump-impeachment": {
        "agency": "Kalshi",
        "source": "kalshi",
        "api_id": "kximpeach",
        "outcome_map": {"Before Jan 1, 2027": "impeached_before_2027_odds", "Before Jan 1, 2028": "impeached_before_2028_odds"},
        "implemented": False,
        "note": "Kalshi public API requires Cloudflare challenge; cannot poll from GitHub Actions. No equivalent Polymarket market found after searching common slugs. Verify odds manually from the Kalshi URL per docs/financial_fetch.md.",
    },
    # --- Not yet implemented: no verified public API / source URL ---
    "existing-home-sales": {
        "agency": "NAR",
        "source": "nar",
        "api_id": None,
        "implemented": False,
        "note": "NAR Existing Home Sales is released as a monthly PDF/press release, no clean public API identified. Need source URL + parse logic.",
    },
    "pending-home-sales-index": {
        "agency": "NAR",
        "source": "nar",
        "api_id": None,
        "implemented": False,
        "note": "NAR Pending Home Sales Index is released as a monthly PDF/press release, no clean public API identified.",
    },
    "median-home-price": {
        "agency": "NAR",
        "source": "nar",
        "api_id": None,
        "implemented": False,
        "note": "NAR Median Home Price is released as a monthly PDF/press release, no clean public API identified.",
    },
    "shipping-container-rate": {
        "agency": "Freightos",
        "source": "freightos",
        "api_id": None,
        "implemented": False,
        "note": "Freightos FBX container rate may require a partner API key; no public endpoint identified.",
    },
    "days-on-market": {
        "agency": "Zillow",
        "source": "zillow",
        "api_id": None,
        "implemented": False,
        "note": "Zillow days-on-market data is behind Zillow Research API which may require a key; no public endpoint identified.",
    },
    "port-teu-volume": {
        "agency": "Port of LA/Long Beach",
        "source": "port_of_la",
        "api_id": None,
        "implemented": False,
        "note": "Port of LA/Long Beach TEU volume is published in monthly statistics reports; no clean public API identified.",
    },
    "realtime-unemployment-forecast": {
        "agency": "Chicago Fed",
        "source": "chicago_fed",
        "api_id": None,
        "implemented": False,
        "note": "Chicago Fed real-time unemployment forecast needs source URL + parse logic.",
    },
    "crack-margin": {
        "agency": "EIA",
        "source": "eia",
        "api_id": None,
        "implemented": False,
        "note": "EIA 3:2:1 crack spread needs EIA API key + series ID; see https://www.eia.gov/opendata/.",
    },
    "copper-futures": {
        "agency": "CME",
        "source": "cme",
        "api_id": None,
        "implemented": False,
        "note": "CME copper futures data needs CME market data endpoint; no public endpoint identified.",
    },
    "tps-applications-approved": {
        "agency": "USCIS",
        "source": "uscis",
        "api_id": None,
        "implemented": False,
        "note": "USCIS TPS applications data needs source URL + parse logic.",
    },
    "southern-border-encounters": {
        "agency": "CBP",
        "source": "cbp",
        "api_id": None,
        "implemented": False,
        "note": "CBP southern border encounters needs source URL + parse logic.",
    },
    "used-vehicle-value-index": {
        "agency": "Manheim",
        "source": "manheim",
        "api_id": None,
        "implemented": False,
        "note": "Manheim Used Vehicle Value Index is likely behind a subscription/API key.",
    },
    "strait-of-hormuz-daily-transits": {
        "agency": "Windward",
        "source": "windward",
        "api_id": None,
        "implemented": False,
        "note": "Windward Strait of Hormuz daily transits is commercial maritime intelligence data; likely requires API key.",
    },
    "housing-market-index": {
        "agency": "NAHB",
        "source": "nahb",
        "api_id": None,
        "implemented": False,
        "note": "NAHB Housing Market Index is released monthly; no clean public API identified.",
    },
    "employment-trends-index": {
        "agency": "The Conference Board",
        "source": "conference_board",
        "api_id": None,
        "implemented": False,
        "note": "Conference Board Employment Trends Index may require subscription.",
    },
    "lagging-economic-index": {
        "agency": "The Conference Board",
        "source": "conference_board",
        "api_id": None,
        "implemented": False,
        "note": "Conference Board Lagging Economic Index may require subscription.",
    },
    "leading-economic-indicator": {
        "agency": "The Conference Board",
        "source": "conference_board",
        "api_id": None,
        "implemented": False,
        "note": "Conference Board Leading Economic Index may require subscription.",
    },
    "private-employment": {
        "agency": "ADP",
        "source": "adp",
        "api_id": None,
        "implemented": False,
        "note": "ADP Private Employment (National Employment Report) may require subscription/API key.",
    },
    "job-openings": {
        "agency": "BLS",
        "source": "bls",
        "api_id": None,
        "implemented": False,
        "note": "Now covered by fetch-bls.yml / scripts/fetch_bls.py (JTSJOL series added). Remove from this registry.",
    },
    "job-cuts-report": {
        "agency": "Challenger Gray & Christmas",
        "source": "challenger",
        "api_id": None,
        "implemented": False,
        "note": "Challenger Job Cuts Report is a monthly press release; no clean public API identified.",
    },
    "manufacturing-pmi": {
        "agency": "ISM",
        "source": "ism",
        "api_id": None,
        "implemented": False,
        "note": "ISM Manufacturing PMI may require subscription.",
    },
    "services-pmi": {
        "agency": "ISM",
        "source": "ism",
        "api_id": None,
        "implemented": False,
        "note": "ISM Services PMI may require subscription.",
    },
    "composite-pmi-flash": {
        "agency": "S&P Global",
        "source": "sp_global",
        "api_id": None,
        "implemented": False,
        "note": "S&P Global Composite PMI (Flash) may require subscription/API key.",
    },
    "waymo-trips-per-week": {
        "agency": "Robotaxi Tracker",
        "source": "robotaxi_tracker",
        "api_id": None,
        "implemented": False,
        "note": "Waymo trips per week from Robotaxi Tracker; no public API identified.",
    },
    "urea-price": {
        "agency": "USDA",
        "source": "usda",
        "api_id": None,
        "implemented": False,
        "note": "USDA Urea source is an AMS PDF (ams_3621.pdf), not a NASS text file. Not in fetch_usda.py INDICATOR_URLS; needs a separate fetch approach.",
    },
}


def find_indicator(data, indicator_id, agency):
    """Find an indicator object by id and agency."""
    for idx in data.get("indices", []):
        if idx.get("id") == indicator_id and idx.get("agency") == agency:
            return idx
    return None


LEGACY_BINARY_KEYS = {"yes_odds": "yes", "no_odds": "no"}


def normalize_snapshot(snapshot):
    """Rewrite legacy binary snapshot keys (yes_odds/no_odds) to canonical yes/no."""
    if not any(key in snapshot for key in LEGACY_BINARY_KEYS):
        return snapshot
    normalized = {}
    for key, value in snapshot.items():
        normalized[LEGACY_BINARY_KEYS.get(key, key)] = value
    return normalized


def update_indicator(indicator, outcomes, updated_at, outcome_map, top_level_map=None):
    """Write fetched outcomes into an indicator: probabilities + top-level fields + lastUpdated."""
    date_key = todays_date_key()
    probs = indicator.setdefault("probabilities", {})

    # Build the probability snapshot for today.
    snapshot = {}
    for api_name, price in outcomes.items():
        field = outcome_map.get(api_name, api_name) if outcome_map else api_name
        if field:
            snapshot[field] = price
    snapshot = normalize_snapshot(snapshot)

    if snapshot:
        existing = probs.get(date_key)
        if existing is None or existing != snapshot:
            probs[date_key] = snapshot
            indicator["newMonth"] = True
        else:
            indicator["newMonth"] = False

    # Update top-level odds fields from the latest snapshot.
    for field, price in snapshot.items():
        targets = (top_level_map or {}).get(field, [field])
        for target in targets:
            indicator[target] = price

    indicator["lastUpdated"] = updated_at or datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    return snapshot


def main(dry_run=False):
    with open(FINANCIALS_PATH, "r") as f:
        data = json.load(f)

    indices = data.setdefault("indices", [])
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    changes = []
    skipped = []

    for indicator_id, cfg in SOURCE_REGISTRY.items():
        if not cfg.get("implemented"):
            skipped.append((indicator_id, cfg.get("note", "not implemented")))
            continue

        source = cfg["source"]
        api_id = cfg.get("api_id")
        outcome_map = cfg.get("outcome_map") or {}
        top_level_map = cfg.get("top_level_map") or {}
        market_configs = cfg.get("market_configs") or []
        agency = cfg.get("agency")

        indicator = find_indicator(data, indicator_id, agency)
        if not indicator:
            print(f"  Indicator '{indicator_id}' (agency={agency}) not found in JSON; skipping")
            continue

        print(f"Fetching {indicator_id} ({source}, {api_id})...")

        try:
            if source == "polymarket":
                result = fetch_polymarket(api_id, market_configs)
                fetch_outcome_map = {}  # outcomes already mapped to field names
            elif source == "kalshi":
                result = fetch_kalshi(api_id)
                fetch_outcome_map = outcome_map
            else:
                print(f"  Unknown source type '{source}' for {indicator_id}")
                continue
        except Exception as e:
            print(f"  Error fetching {indicator_id}: {e}")
            continue

        if not result:
            print(f"  No data returned for {indicator_id}")
            continue

        snapshot = update_indicator(indicator, result["outcomes"], result.get("updatedAt"), fetch_outcome_map, top_level_map)
        indicator["lastUpdated"] = now_iso
        label = ", ".join(f"{k}={v}" for k, v in snapshot.items())
        changes.append(f"{indicator_id}: {label}")

    data["lastUpdated"] = now_iso

    if skipped:
        print("\n--- Skipped (not implemented) ---")
        for indicator_id, note in skipped:
            print(f"  {indicator_id}: {note}")

    if changes:
        print("\nChanges:")
        for c in changes:
            print(f"  - {c}")
    else:
        print("\nNo changes.")

    if dry_run:
        print("Dry run: JSON not written.")
        return

    with open(FINANCIALS_PATH, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"\nSaved to {FINANCIALS_PATH}")


if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    main(dry_run=dry_run)
