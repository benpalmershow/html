#!/usr/bin/env python3
"""
Fetch 2026 Senate race candidate finance totals from the OpenFEC API.
Updates json/fec-data.json with fundraising/spending data.

API docs: https://api.open.fec.gov/developers/
Requires: FEC_API_KEY environment variable (get a free key at https://api.open.fec.gov/developers/)
"""

import json
from fetch_utils import atomic_write_json
import os
import logging
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

load_dotenv()

# ── Config ─────────────────────────────────────────────────────────────────────

API_KEY = os.environ.get("FEC_API_KEY", "")
BASE_URL = "https://api.open.fec.gov/v1"
CYCLE = 2026
OUTPUT_FILE = Path(__file__).parent.parent / "json" / "fec-data.json"

# Polymarket gamma API (public, no key required) - used as results source
# when Kalshi is blocked by Cloudflare.
POLYMARKET_GAMMA_BASE = "https://gamma-api.polymarket.com/events"

# Seconds to wait between candidate requests (avoid 429s on DEMO_KEY / free tier)
REQUEST_DELAY = 1.2

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# ── Races ──────────────────────────────────────────────────────────────────────
# Static race/candidate definitions. Finance data is filled in by the API.

RACES = [
    {
        "state": "GA",
        "label": "Georgia Senate",
        "note": "Safe D. Ossoff (D) incumbent vs. Collins (R).",
        "polymarket": {"r": 8, "d": 92},
        "polymarket_url": "https://kalshi.com/markets/senatega/georgia-senate-race/senatega-26",
        "kalshi_ticker": "SENATEGA-26",
        "polymarket_slug": "georgia-senate-election-winner",
        "polymarket_url": "https://polymarket.com/event/georgia-senate-election-winner",
        "candidates": [
            {
                "candidate_id": "S8GA00180",
                "name": "Jon Ossoff",
                "party": "DEM",
                "incumbent": True,
                "source_url": "https://www.fec.gov/data/candidate/S8GA00180/",
            },
            {
                "candidate_id": "S6GA00390",
                "name": "Mike Collins",
                "party": "REP",
                "incumbent": False,
                "source_url": "https://www.fec.gov/data/candidate/S6GA00390/",
            },
        ],
    },
    {
        "state": "TX",
        "label": "Texas Senate",
        "note": "Talarico (D) won. Paxton (R). Open seat - Cornyn lost primary.",
        "result": "called",
        "winner_party": "DEM",
        "polymarket": {"r": 0, "d": 100},
        "polymarket_url": "https://kalshi.com/markets/senatetx/texas-senate-race/senatetx-26",
        "kalshi_ticker": "SENATX-26",
        "polymarket_slug": "texas-senate-election-winner",
        "polymarket_url": "https://polymarket.com/event/texas-senate-election-winner",
        "candidates": [
            {
                "candidate_id": "S6TX00388",
                "name": "Ken Paxton",
                "party": "REP",
                "incumbent": False,
                "source_url": "https://www.fec.gov/data/candidate/S6TX00388/",
            },
            {
                "candidate_id": "S6TX00479",
                "name": "James Talarico",
                "party": "DEM",
                "incumbent": False,
                "source_url": "https://www.fec.gov/data/candidate/S6TX00479/",
            },
        ],
    },
    {
        "state": "OH",
        "label": "Ohio Senate",
        "note": "Toss-up. Husted (R) incumbent vs. Brown (D). Special election for JD Vance's vacated seat.",
        "polymarket": {"r": 48, "d": 52},
        "polymarket_url": "https://kalshi.com/markets/senateohs/m/senateohs-26",
        "kalshi_ticker": "SENATEOHS-26",
        "polymarket_slug": "ohio-senate-election-winner",
        "polymarket_url": "https://polymarket.com/event/ohio-senate-election-winner",
        "candidates": [
            {
                "candidate_id": "S6OH00304",
                "name": "Jon Husted",
                "party": "REP",
                "incumbent": True,
                "source_url": "https://www.fec.gov/data/candidate/S6OH00304/",
            },
            {
                "candidate_id": "S6OH00163",
                "name": "Sherrod Brown",
                "party": "DEM",
                "incumbent": False,
                "source_url": "https://www.fec.gov/data/candidate/S6OH00163/",
            },
        ],
    },
    {
        "state": "NC",
        "label": "North Carolina Senate",
        "note": "Safe D. Open seat - Tillis retiring. Cooper (D) vs. Whatley (R).",
        "polymarket": {"r": 8, "d": 92},
        "polymarket_url": "https://kalshi.com/markets/senatenc/north-carolina-senate-race/senatenc-26",
        "kalshi_ticker": "SENATENC-26",
        "polymarket_slug": "north-carolina-senate-election-winner",
        "polymarket_url": "https://polymarket.com/event/north-carolina-senate-election-winner",
        "candidates": [
            {
                "candidate_id": "S6NC00407",
                "name": "Roy Cooper",
                "party": "DEM",
                "incumbent": False,
                "source_url": "https://www.fec.gov/data/candidate/S6NC00407/",
            },
            {
                "candidate_id": "S6NC00415",
                "name": "Michael Whatley",
                "party": "REP",
                "incumbent": False,
                "source_url": "https://www.fec.gov/data/candidate/S6NC00415/",
            },
        ],
    },
    {
        "state": "KS",
        "label": "Kansas Senate",
        "note": "Hamilton (D) won. Marshall (R) incumbent.",
        "result": "called",
        "winner_party": "DEM",
        "polymarket": {"r": 0, "d": 100},
        "polymarket_url": "https://kalshi.com/markets/senateks/kansas-senate-race/senateks-26",
        "kalshi_ticker": "SENATEKS-26",
        "polymarket_slug": "kansas-senate-election-winner",
        "polymarket_url": "https://polymarket.com/event/kansas-senate-election-winner",
        "candidates": [
            {
                "candidate_id": "S0KS00315",
                "name": "Roger Marshall",
                "party": "REP",
                "incumbent": True,
                "source_url": "https://www.fec.gov/data/candidate/S0KS00315/",
            },
            {
                "candidate_id": "S6KS00312",
                "name": "Adam Hamilton",
                "party": "DEM",
                "incumbent": False,
                "source_url": "https://www.fec.gov/data/candidate/S6KS00312/",
            },
        ],
    },
    {
        "state": "ME",
        "label": "Maine Senate",
        "note": "Jackson (D) won. Collins (R) incumbent.",
        "polymarket": {"r": 0, "d": 100},
        "polymarket_url": "https://kalshi.com/markets/senateme/maine-senate-race/senateme-26",
        "kalshi_ticker": "SENATEME-26",
        "polymarket_slug": "maine-senate-election-winner",
        "polymarket_url": "https://polymarket.com/event/maine-senate-election-winner",
        "candidates": [
            {
                "candidate_id": "S6ME00159",
                "name": "Susan Collins",
                "party": "REP",
                "incumbent": True,
                "source_url": "https://www.fec.gov/data/candidate/S6ME00159/",
            },
            {
                "candidate_id": "S6ME00464",
                "name": "Troy Jackson",
                "party": "DEM",
                "incumbent": False,
                "source_url": "https://www.fec.gov/data/candidate/S6ME00464/",
            },
        ],
    },
    {
        "state": "MI",
        "label": "Michigan Senate",
        "note": "Safe D. Open seat - Peters retiring. El-Sayed (D) vs. Rogers (R).",
        "polymarket": {"r": 30, "d": 70},
        "polymarket_url": "https://kalshi.com/markets/senatemi/michigan-senate-race/senatemi-26",
        "kalshi_ticker": "SENATEMI-26",
        "polymarket_slug": "michigan-senate-election-winner",
        "polymarket_url": "https://polymarket.com/event/michigan-senate-election-winner",
        "candidates": [
            {
                "candidate_id": "S4MI00595",
                "name": "Mike Rogers",
                "party": "REP",
                "incumbent": False,
                "source_url": "https://www.fec.gov/data/candidate/S4MI00595/",
            },
            {
                "candidate_id": "S6MI00418",
                "name": "Abdul El-Sayed",
                "party": "DEM",
                "incumbent": False,
                "source_url": "https://www.fec.gov/data/candidate/S6MI00418/",
            },
        ],
    },
    {
        "state": "IA",
        "label": "Iowa Senate",
        "note": "Turek (D) won. Hinson (R). Open seat - Ernst retiring.",
        "result": "called",
        "winner_party": "DEM",
        "polymarket": {"r": 0, "d": 100},
        "polymarket_url": "https://kalshi.com/markets/senateia/iowa-senate-race/senateia-26",
        "kalshi_ticker": "SENATEIA-26",
        "polymarket_slug": "iowa-senate-election-winner",
        "polymarket_url": "https://polymarket.com/event/iowa-senate-election-winner",
        "candidates": [
            {
                "candidate_id": "S6IA00314",
                "name": "Ashley Hinson",
                "party": "REP",
                "incumbent": False,
                "source_url": "https://www.fec.gov/data/candidate/S6IA00314/",
            },
            {
                "candidate_id": "S6IA00298",
                "name": "Josh Turek",
                "party": "DEM",
                "incumbent": False,
                "source_url": "https://www.fec.gov/data/candidate/S6IA00298/",
            },
        ],
    },
    {
        "state": "NH",
        "label": "New Hampshire Senate",
        "note": "Safe D. Open seat - Shaheen retiring. Pappas (D) vs. Sununu (R).",
        "polymarket": {"r": 11, "d": 89},
        "polymarket_url": "https://kalshi.com/markets/senatenh/new-hampshire-senate-race/senatenh-26",
        "kalshi_ticker": "SENATENH-26",
        "polymarket_slug": "new-hampshire-senate-election-winner",
        "polymarket_url": "https://polymarket.com/event/new-hampshire-senate-election-winner",
        "candidates": [
            {
                "candidate_id": "S6NH00141",
                "name": "Chris Pappas",
                "party": "DEM",
                "incumbent": False,
                "source_url": "https://www.fec.gov/data/candidate/S6NH00141/",
            },
            {
                "candidate_id": "S6NH00208",
                "name": "John E. Sununu",
                "party": "REP",
                "incumbent": False,
                "source_url": "https://www.fec.gov/data/candidate/S6NH00208/",
            },
        ],
    },
]

# ── API helpers ────────────────────────────────────────────────────────────────

@retry(
    retry=retry_if_exception_type(requests.RequestException),
    stop=stop_after_attempt(4),
    wait=wait_exponential(multiplier=2, min=3, max=30),
)
def fetch_candidate_totals(candidate_id: str) -> dict:
    """
    Fetch fundraising totals for a single candidate from /candidates/totals/.
    Returns a dict with receipts, disbursements, cash_on_hand, coverage_end_date,
    or an empty dict on failure.
    """
    url = f"{BASE_URL}/candidates/totals/"
    params = {
        "candidate_id": candidate_id,
        "cycle": CYCLE,
        "per_page": 1,
        "api_key": API_KEY,
    }

    logger.info(f"Fetching totals for {candidate_id}")
    resp = requests.get(url, params=params, timeout=20)

    if resp.status_code == 429:
        logger.warning(f"Rate limited for {candidate_id}, will retry")
        raise requests.RequestException("Rate limited (429)")

    resp.raise_for_status()
    data = resp.json()
    results = data.get("results", [])

    if not results:
        logger.warning(f"No totals returned for {candidate_id}")
        return {}

    r = results[0]
    return {
        "receipts": r.get("receipts"),
        "disbursements": r.get("disbursements"),
        "cash_on_hand_end_period": r.get("cash_on_hand_end_period"),
        "coverage_end_date": r.get("coverage_end_date"),
    }


def _kalshi_price_to_int(value):
    """Convert a Kalshi price (decimal 0-1 or cents) to an integer cent value."""
    try:
        v = float(value)
    except (TypeError, ValueError):
        return None
    cents = v * 100.0 if v <= 1.0 else v
    return int(round(cents))


def _party_from_outcome(name):
    """Heuristically map a Kalshi outcome name to a party."""
    n = (name or "").lower()
    if any(k in n for k in ("dem", "democratic")):
        return "DEM"
    if any(k in n for k in ("rep", "republican")):
        return "REP"
    return None


def fetch_kalshi_race(ticker, max_retries=3):
    """Fetch a Kalshi market and return {r, d, called, winner_party, updated_at}.

    Returns None when the API is unreachable (Cloudflare/404) so callers fall
    back to the static kalshi values in the race definition.
    """
    url = f"{BASE_URL.replace('/v1', '')}/trade/api/v2/markets/{ticker}"
    for attempt in range(max_retries):
        try:
            resp = requests.get(url, headers={"User-Agent": "howdy-stranger/1.0"}, timeout=30)
            if resp.status_code == 429:
                raise requests.RequestException("Rate limited (429)")
            resp.raise_for_status()
            data = resp.json()
            break
        except Exception as e:
            if attempt == max_retries - 1:
                logger.warning(f"Kalshi API unavailable for {ticker}: {e}")
                return None
            time.sleep(2 ** attempt)
    else:
        return None

    market = data.get("market") or data
    updated_at = market.get("last_updated") or market.get("updatedAt") or ""

    r_price = None
    d_price = None
    called = False
    winner_party = None

    for outcome in market.get("outcomes") or []:
        name = outcome.get("name") or outcome.get("outcome")
        price = outcome.get("price") or outcome.get("last_price") or outcome.get("bid")
        if name is None or price is None:
            continue
        cents = _kalshi_price_to_int(price)
        if cents is None:
            continue
        party = _party_from_outcome(name)
        if party == "DEM":
            d_price = cents
        elif party == "REP":
            r_price = cents
        if cents >= 100:
            called = True
            winner_party = party

    # Fallback: yes_bid / no_bid fields (map Yes->DEM, No->REP by convention only
    # when no partyed outcomes were found).
    if r_price is None and d_price is None:
        yes_bid = market.get("yes_bid")
        no_bid = market.get("no_bid")
        if yes_bid is not None:
            d_price = _kalshi_price_to_int(yes_bid)
        if no_bid is not None:
            r_price = _kalshi_price_to_int(no_bid)

    return {
        "r": r_price,
        "d": d_price,
        "called": called,
        "winner_party": winner_party,
        "updated_at": updated_at,
    }


def fetch_polymarket_race(slug, max_retries=3):
    """Fetch a Polymarket Senate event and return {r, d, called, winner_party, updated_at}.

    Looks for the "Will the Democrats win the <State> Senate race in 2026?" and
    "Will the Republicans win..." markets. A Yes price of ~1.0 means that party
    won (market resolved). Returns None when the API is unreachable.
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
                logger.warning(f"Polymarket API unavailable for {slug}: {e}")
                return None
            time.sleep(2 ** attempt)
    else:
        return None

    events = data if isinstance(data, list) else data.get("events", [])
    if not events:
        logger.warning(f"No Polymarket event for slug {slug}")
        return None

    event = events[0]
    updated_at = event.get("updatedAt") or ""

    d_price = None
    r_price = None
    called = False
    winner_party = None

    for market in event.get("markets") or []:
        question = (market.get("question") or "").lower()
        outcomes = market.get("outcomes") or []
        prices = market.get("outcomePrices") or []
        if len(outcomes) != len(prices):
            continue
        try:
            yes_price = float(prices[0]) if outcomes[0] == "Yes" else None
        except (ValueError, TypeError, IndexError):
            yes_price = None
        if yes_price is None:
            continue
        cents = int(round(yes_price * 100.0))
        if "democrats win" in question:
            d_price = cents
            if cents >= 99:
                called = True
                winner_party = "DEM"
        elif "republicans win" in question:
            r_price = cents
            if cents >= 99:
                called = True
                winner_party = "REP"

    return {
        "r": r_price,
        "d": d_price,
        "called": called,
        "winner_party": winner_party,
        "updated_at": updated_at,
    }


# ── Main ────────────────────────────────────────────────────────────────────────

def main() -> int:
    if not API_KEY:
        logger.error(
            "FEC_API_KEY environment variable is not set. "
            "Get a free key at https://api.open.fec.gov/developers/"
        )
        return 1

    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    races_out = []

    for race in RACES:
        candidates_out = []
        for cand in race["candidates"]:
            cand_out = dict(cand)  # copy static fields
            cand_out["source"] = "OpenFEC API"

            try:
                totals = fetch_candidate_totals(cand["candidate_id"])
                cand_out.update(totals)
            except Exception as e:
                logger.error(f"Failed to fetch {cand['candidate_id']} ({cand['name']}): {e}")
                cand_out["fetch_error"] = str(e)

            candidates_out.append(cand_out)

            # Polite delay between requests
            time.sleep(REQUEST_DELAY)

        # Overlay odds / results from Polymarket (primary, reachable) with Kalshi
        # as fallback. Falls back to the static values in the race definition when
        # both APIs are unreachable.
        race_out = dict(race)
        polymarket_slug = race.get("polymarket_slug")
        kalshi_ticker = race.get("kalshi_ticker")

        overlay = None
        if polymarket_slug:
            overlay = fetch_polymarket_race(polymarket_slug)
        if overlay is None and kalshi_ticker:
            overlay = fetch_kalshi_race(kalshi_ticker)

        if overlay:
            static_polymarket = dict(race_out.get("polymarket") or {})
            if overlay["r"] is not None:
                static_polymarket["r"] = overlay["r"]
            if overlay["d"] is not None:
                static_polymarket["d"] = overlay["d"]
            race_out["polymarket"] = static_polymarket
            if overlay["called"] and overlay["winner_party"]:
                race_out["result"] = "called"
                race_out["winner_party"] = overlay["winner_party"]

        races_out.append({**race_out, "candidates": candidates_out})

    output = {
        "source": "OpenFEC API",
        "source_url": "https://api.open.fec.gov/developers/",
        "cycle": CYCLE,
        "races": races_out,
    }

    if OUTPUT_FILE.exists():
        try:
            existing = json.loads(OUTPUT_FILE.read_text())
            if {k: v for k, v in existing.items() if k != "lastUpdated"} == output:
                logger.info("No FEC data changes; skipping write")
                return 0
        except Exception:
            pass

    output = {"lastUpdated": now, **output}
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    atomic_write_json(OUTPUT_FILE, output)

    logger.info(f"Wrote {OUTPUT_FILE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
