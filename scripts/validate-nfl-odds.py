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
import sys
import time
from pathlib import Path

try:
    import yaml
except ImportError:
    print("PyYAML is required. Install with: pip install pyyaml")
    raise SystemExit(1)

from polymarket_utils import fetch_event, find_moneyline

ROOT = Path(__file__).resolve().parent.parent
YAML_PATH = ROOT / "data" / "nfl-games.yml"


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
        except Exception as e:
            failures.append(f"[{game_id}] API error for slug {slug}: {e}")
            continue

        if not events:
            failures.append(f"[{game_id}] no Polymarket event for slug {slug}")
            continue
        event = events[0]
        found = find_moneyline(event, away_pm, home_pm, game.get("away_full"), game.get("home_full"))
        if not found:
            failures.append(f"[{game_id}] moneyline market not found (away={away_pm}, home={home_pm})")

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
