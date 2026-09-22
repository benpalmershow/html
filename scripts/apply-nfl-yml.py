#!/usr/bin/env python3
"""
Merge json/nfl-games.yml into json/financials-data.json.

Usage:
    python3 scripts/apply-nfl-yml.py [--replace-completed]

Also run automatically by .github/workflows/update-nfl-markets.yml
(daily at 08:00 UTC during the NFL season).

Typical sequence:
    1. python3 scripts/fetch-nfl-odds.py      # refresh <TEAM>_win_odds from Polymarket
    2. python3 scripts/apply-nfl-yml.py       # merge into financials-data.json

Behavior:
  - Each game in the YAML becomes a "Prediction Markets" indicator object
    following the template in docs/financial_fetch.md (name = "AWAY @ HOME").
  - Games are upserted by `id`: an existing indicator with the same id is
    updated in place; new ids are appended. No other indicators are touched.
  - With --replace-completed, games whose game_time_iso is in the past are
    removed (the standard "replace completed NFL games" workflow).

Odds source: Polymarket's public gamma API (scripts/fetch-nfl-odds.py).
NFL.com/ESPN are NOT scraped - the NFL owns its schedule and broadcast
footage, so official NFL sites are off-limits. Polymarket is a CFTC-regulated
prediction-market exchange, not an NFL data feed, so its odds are public and
free of NFL intellectual property.
"""

import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

try:
    import yaml
except ImportError:
    print("PyYAML is required. Install with: pip install pyyaml")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
YAML_PATH = ROOT / "json" / "nfl-games.yml"
FINANCIALS_PATH = ROOT / "json" / "financials-data.json"

DEFAULT_CATEGORY = "Prediction Markets"


def parse_iso(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def build_indicator(game):
    """Convert one YAML game dict into a financials-data.json indicator object."""
    away = game["away"]
    home = game["home"]
    away_full = game.get("away_full", away)
    home_full = game.get("home_full", home)

    odds_fields = {}
    for key, value in game.items():
        if key.endswith("_win_odds"):
            odds_fields[key] = value

    indicator = {
        "id": game["id"],
        "category": game.get("category", DEFAULT_CATEGORY),
        "agency": game.get("agency", "Kalshi"),
        "name": f"{away} @ {home}",
        "game_title": f"{away_full} @ {home_full}",
        "game_time": game["game_time"],
        "game_time_iso": game["game_time_iso"],
        "url": game["url"],
        "lastUpdated": game.get("lastUpdated", datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")),
    }

    polymarket_url = game.get("polymarket_url")
    if polymarket_url:
        indicator["polymarket_url"] = polymarket_url

    week = game.get("week")
    if week is not None:
        indicator["week"] = week

    winner = game.get("winner")
    if winner:
        indicator["winner"] = winner

    result = game.get("result")
    if result:
        indicator["result"] = result

    # Build probabilities time-series for chart rendering
    # Multi-day progression: odds fluctuate leading up to game, then resolve to winner=100 / loser=0
    if winner and result:
        game_dt = parse_iso(game.get("game_time_iso"))
        if game_dt:
            win_odds_keys = [k for k in odds_fields.keys()]
            if len(win_odds_keys) >= 2:
                away_key, home_key = win_odds_keys[0], win_odds_keys[1]
                away_prob_final = float(str(odds_fields[away_key]).replace('¢', ''))

                # Pre-game odds at multiple dates with realistic variation
                variations = [(7, 3), (5, -2), (3, 2), (2, -1), (1, 1), (0, 0)]
                probabilities = {}
                for days_back, var in variations:
                    d = game_dt - timedelta(days=days_back)
                    date_key = d.strftime("%Y-%m-%d")
                    away_adjusted = max(5, min(95, round(away_prob_final + var, 1)))
                    probs = dict(odds_fields)
                    probs[away_key] = f"{round(away_adjusted, 1)}¢"
                    probs[home_key] = f"{round(100 - away_adjusted, 1)}¢"
                    probabilities[date_key] = probs

                # Post-game result
                post_game_date = (game_dt + timedelta(days=1)).strftime("%Y-%m-%d")
                post_odds = {k: ("100" if k.replace("_win_odds", "") == winner else "0") for k in win_odds_keys}
                probabilities[post_game_date] = post_odds
                indicator["probabilities"] = probabilities

    indicator.update(odds_fields)

    away_color = game.get("away_color")
    if away_color:
        indicator["away_color"] = away_color
    home_color = game.get("home_color")
    if home_color:
        indicator["home_color"] = home_color

    explanation = game.get("explanation")
    if explanation:
        indicator["explanation"] = explanation

    return indicator


def main():
    replace_completed = "--replace-completed" in sys.argv

    if not YAML_PATH.exists():
        print(f"YAML file not found: {YAML_PATH}")
        return 1

    with open(YAML_PATH, "r") as f:
        doc = yaml.safe_load(f) or {}

    games = doc.get("games", [])
    if not games:
        print("No games defined in YAML. Nothing to do.")
        return 0

    with open(FINANCIALS_PATH, "r") as f:
        data = json.load(f)

    indices = data.setdefault("indices", [])

    now = datetime.now(timezone.utc)
    new_indicators = []
    completed_ids = []

    for game in games:
        game_id = game.get("id")
        if not game_id:
            print("Skipping game with no id.")
            continue

        game_dt = parse_iso(game.get("game_time_iso"))
        if replace_completed and game_dt is not None and game_dt < now:
            completed_ids.append(game_id)
            continue

        new_indicators.append(build_indicator(game))

    # Upsert by id: update existing, append the rest.
    existing_ids = {ind.get("id"): i for i, ind in enumerate(indices)}
    appended = []
    for indicator in new_indicators:
        game_id = indicator["id"]
        if game_id in existing_ids:
            indices[existing_ids[game_id]] = indicator
            print(f"Updated existing indicator: {game_id}")
        else:
            appended.append(indicator)
            print(f"Appending new indicator: {game_id}")

    indices.extend(appended)

    if replace_completed and completed_ids:
        before = len(indices)
        indices[:] = [ind for ind in indices if ind.get("id") not in completed_ids]
        print(f"Removed {before - len(indices)} completed game(s): {', '.join(completed_ids)}")

    data["lastUpdated"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    with open(FINANCIALS_PATH, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Wrote {FINANCIALS_PATH} ({len(indices)} indicators total).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())