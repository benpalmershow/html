#!/usr/bin/env python3
"""
Validate that every NFL game in data/nfl-games.yml has a live Polymarket
moneyline market with both team outcomes and usable prices.

Exits non-zero if any game is missing its event or moneyline market, so the
GitHub Actions job fails and prompts manual review.

Usage:
    python3 scripts/validate-nfl-odds.py [--week 5]

Without --week, all games in the YAML are validated.
"""

import argparse
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

try:
    import yaml
except ImportError:
    print("PyYAML is required. Install with: pip install pyyaml")
    raise SystemExit(1)

ROOT = Path(__file__).resolve().parent.parent
YAML_PATH = ROOT / "data" / "nfl-games.yml"
GAMMA_BASE = "https://gamma-api.polymarket.com/events"


def fetch_event(slug, max_retries=3):
    url = f"{GAMMA_BASE}?slug={urllib.parse.quote(slug)}"
    req = urllib.request.Request(url, headers={"User-Agent": "howdy-stranger-nfl-validate/1.0"})
    last_err = None
    for attempt in range(max_retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except (urllib.error.URLError, urllib.error.HTTPError) as e:
            last_err = e
            if attempt < max_retries - 1:
                import time
                time.sleep(2 ** attempt)
    raise last_err


def _parse_json_list(value):
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


def find_moneyline(event, away_name, home_name):
    for m in event.get("markets") or []:
        if m.get("sportsMarketType") != "moneyline":
            continue
        outcomes = _parse_json_list(m.get("outcomes"))
        prices = _parse_json_list(m.get("outcomePrices"))
        if len(outcomes) != 2 or len(prices) != 2:
            continue
        if set(outcomes) != {away_name, home_name}:
            continue
        return prices[outcomes.index(away_name)], prices[outcomes.index(home_name)]
    return None


def main():
    parser = argparse.ArgumentParser(description="Validate NFL moneyline markets exist for YAML games.")
    parser.add_argument("--week", type=int, help="Validate only games from this NFL week.")
    args = parser.parse_args()

    if not YAML_PATH.exists():
        print(f"YAML file not found: {YAML_PATH}")
        return 1

    with open(YAML_PATH, "r") as f:
        doc = yaml.safe_load(f) or {}
    games = doc.get("games", [])

    failures = []
    checked = 0
    for game in games:
        game_id = game.get("id")
        if args.week is not None and game.get("week") != args.week:
            continue
        slug = game.get("polymarket_slug")
        if not slug:
            failures.append(f"[{game_id}] no polymarket_slug")
            continue
        away_pm = game.get("away_pm_name")
        home_pm = game.get("home_pm_name")
        if not away_pm or not home_pm:
            failures.append(f"[{game_id}] missing away_pm_name/home_pm_name")
            continue
        checked += 1
        try:
            events = fetch_event(slug)
        except (urllib.error.URLError, urllib.error.HTTPError) as e:
            failures.append(f"[{game_id}] API error for slug {slug}: {e}")
            continue
        except Exception as e:
            failures.append(f"[{game_id}] unexpected error: {e}")
            continue

        if not events:
            failures.append(f"[{game_id}] no Polymarket event for slug {slug}")
            continue
        event = events[0]
        found = find_moneyline(event, away_pm, home_pm)
        if not found:
            failures.append(f"[{game_id}] moneyline market not found (away={away_pm}, home={home_pm})")

    import time
    time.sleep(0.3)

    if failures:
        print(f"Validation FAILED: {len(failures)} issue(s) across {checked} game(s):")
        for f in failures:
            print(f"  - {f}")
        return 1

    print(f"Validation passed: {checked} game(s) have live moneyline markets.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
