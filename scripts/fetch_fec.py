#!/usr/bin/env python3
"""
Fetch 2026 Senate race candidate finance totals from the OpenFEC API.
Updates json/fec-data.json with fundraising/spending data.

API docs: https://api.open.fec.gov/developers/
Requires: FEC_API_KEY environment variable (get a free key at https://api.open.fec.gov/developers/)
"""

import json
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
        "note": "Toss-up. Ossoff (D) incumbent vs. Collins (R).",
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
        "note": "Toss-up. Paxton (R) vs. Talarico (D). Open seat - Cornyn lost primary.",
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
        "label": "Ohio Senate (Special)",
        "note": "Toss-up. Husted (R) incumbent vs. Brown (D). Special election for JD Vance's vacated seat.",
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
        "note": "Lean R. Open seat - Tillis retiring. Cooper (D) vs. Whatley (R).",
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
        "state": "ME",
        "label": "Maine Senate",
        "note": "Lean R. Collins (R) incumbent vs. Jackson (D).",
        "candidates": [
            {
                "candidate_id": "S6ME00159",
                "name": "Susan Collins",
                "party": "REP",
                "incumbent": True,
                "source_url": "https://www.fec.gov/data/candidate/S6ME00159/",
            },
        ],
    },
    {
        "state": "MI",
        "label": "Michigan Senate",
        "note": "Lean D. Open seat - Peters retiring. El-Sayed (D) vs. Rogers (R).",
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
        "note": "Lean R. Open seat - Ernst retiring. Hinson (R) vs. Turek (D).",
        "candidates": [
            {
                "candidate_id": "S6IA00314",
                "name": "Ashley Hinson",
                "party": "REP",
                "incumbent": False,
                "source_url": "https://www.fec.gov/data/candidate/S6IA00314/",
            },
            {
                "name": "Josh Turek",
                "party": "DEM",
                "incumbent": False,
                # No FEC candidate_id on file yet for 2026 cycle
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
            cand_out["fetchedAt"] = now
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

        races_out.append({**race, "candidates": candidates_out})

    output = {
        "lastUpdated": now,
        "source": "OpenFEC API",
        "source_url": "https://api.open.fec.gov/developers/",
        "cycle": CYCLE,
        "races": races_out,
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        json.dump(output, f, indent=2)

    logger.info(f"Wrote {OUTPUT_FILE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
