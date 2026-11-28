#!/usr/bin/env python3
"""
Fetch LIVE win odds for NFL games from Polymarket and refresh data/nfl-games.yml.

Mirrors scripts/fetch_world_cup.py: a scheduled script polls a public API and
rewrites the data file. No NFL.com/ESPN scraping - the NFL owns its schedule
and broadcast footage, so official NFL sites are off-limits. Polymarket is a
CFTC-regulated prediction-market exchange (not an NFL data feed), so its odds
are public, machine-readable, and free of NFL intellectual property.

Usage:
    python3 scripts/fetch-nfl-odds.py [--week 5] [--game-id ne-sea-2026-09-09]

For each game with a polymarket_slug, this queries:
    https://gamma-api.polymarket.com/events?slug=<slug>
and rewrites the <TEAM>_win_odds fields from the moneyline market's
outcomePrices (e.g. "0.385" -> "38.5¢"). The `lastUpdated` field is set to the
event's updatedAt timestamp. All other YAML content is preserved.

The moneyline market is identified by Polymarket's sportsMarketType field and
the exact away/home outcome labels. Other markets, including spreads and
totals, are ignored.
"""

import argparse
import os
import random
import time
import urllib.error
from datetime import datetime, timedelta, timezone
from pathlib import Path

try:
    import yaml
except ImportError:
    print("PyYAML is required. Install with: pip install pyyaml")
    raise SystemExit(1)

from polymarket_utils import (
    fetch_event,
    find_moneyline,
    parse_game_time_iso,
    price_to_cents,
)

ROOT = Path(__file__).resolve().parent.parent
YAML_PATH = ROOT / "data" / "nfl-games.yml"


def is_live_window(game, now, pre_minutes=15, post_hours=4):
    gt = parse_game_time_iso(game.get("game_time_iso"))
    if gt is None:
        return True
    if gt.tzinfo is None:
        gt = gt.replace(tzinfo=timezone.utc)
    if now >= gt - timedelta(minutes=pre_minutes) and now <= gt + timedelta(hours=post_hours):
        return True
    return False


def is_post_game_window(game, now, post_hours=4, immediate_hours=1):
    """Check if we're in the immediate post-game window for aggressive polling.
    
    Games typically last ~3 hours. This window starts at game_time + 3 hours
    and runs for `immediate_hours` (default 1 hour) for ultra-frequent polling
    to catch settled odds instantly.
    """
    gt = parse_game_time_iso(game.get("game_time_iso"))
    if gt is None:
        return False
    if gt.tzinfo is None:
        gt = gt.replace(tzinfo=timezone.utc)
    # Start 3 hours after kickoff (typical game duration)
    window_start = gt + timedelta(hours=3)
    window_end = window_start + timedelta(hours=immediate_hours)
    return window_start <= now <= window_end


def is_recently_updated(game, now, max_age_min=3):
    lu = game.get("lastUpdated")
    if not lu:
        return False
    try:
        if lu.endswith("Z"):
            lu_dt = datetime.fromisoformat(lu[:-1] + "+00:00")
        else:
            lu_dt = datetime.fromisoformat(lu)
        if lu_dt.tzinfo is None:
            lu_dt = lu_dt.replace(tzinfo=timezone.utc)
        return (now - lu_dt) < timedelta(minutes=max_age_min)
    except Exception:
        return False


def main():
    parser = argparse.ArgumentParser(description="Refresh NFL moneyline odds from Polymarket.")
    parser.add_argument("--game-id", help="Refresh one game by its YAML id.")
    parser.add_argument("--week", type=int, help="Refresh only games from this NFL week.")
    parser.add_argument("--mode", choices=["full", "live", "post-game"], default=os.environ.get("NFL_MODE", "full"), help="full = all selected games; live = only games near/in gametime; post-game = ultra-frequent polling right after games end")
    parser.add_argument("--pre-minutes", type=int, default=int(os.environ.get("NFL_PRE_MINUTES", "15")))
    parser.add_argument("--post-hours", type=int, default=int(os.environ.get("NFL_POST_HOURS", "4")))
    parser.add_argument("--immediate-hours", type=int, default=int(os.environ.get("NFL_IMMEDIATE_HOURS", "4")), help="hours to poll aggressively after game ends (post-game mode)")
    parser.add_argument("--max-age-min", type=int, default=int(os.environ.get("NFL_MAX_AGE_MIN", "3")), help="skip polling if recently updated in live mode")
    parser.add_argument("--no-skip-recent", action="store_true", help="do not skip recently updated games in live mode")
    args = parser.parse_args()

    if not YAML_PATH.exists():
        print(f"YAML file not found: {YAML_PATH}")
        return 1

    with open(YAML_PATH, "r") as f:
        doc = yaml.safe_load(f) or {}
    games = doc.setdefault("games", [])

    now = datetime.now(timezone.utc)
    updated = 0
    selected = 0
    skipped_live = 0
    skipped_recent = 0
    missing_slug = 0
    fetch_failures = 0
    for game in games:
        game_id = game.get("id")
        if args.game_id and game_id != args.game_id:
            continue
        if args.week is not None and game.get("week") != args.week:
            continue
        if args.mode == "live":
            if not is_live_window(game, now, pre_minutes=args.pre_minutes, post_hours=args.post_hours):
                skipped_live += 1
                continue
            if not args.no_skip_recent and is_recently_updated(game, now, max_age_min=args.max_age_min):
                skipped_recent += 1
                continue
        elif args.mode == "post-game":
            if not is_post_game_window(game, now, post_hours=args.post_hours, immediate_hours=args.immediate_hours):
                skipped_live += 1
                continue
            # In post-game mode, don't skip recent updates - we want to catch settled odds
        selected += 1
        slug = game.get("polymarket_slug")
        if not slug:
            print(f"[{game_id}] no polymarket_slug; skipping")
            missing_slug += 1
            continue

        try:
            events = fetch_event(slug)
        except (urllib.error.URLError, urllib.error.HTTPError) as e:
            print(f"[{game_id}] API error for slug {slug} (after retries): {e}")
            fetch_failures += 1
            continue
        except Exception as e:
            print(f"[{game_id}] unexpected error: {e}")
            fetch_failures += 1
            continue

        # Rate limiting: wait between API calls
        if args.mode == "post-game":
            time.sleep(1)
        else:
            time.sleep(random.uniform(0.2, 0.6))

        if not events:
            print(f"[{game_id}] no event for slug {slug}")
            continue
        event = events[0]

        away_pm = game.get("away_pm_name")
        home_pm = game.get("home_pm_name")
        if not away_pm or not home_pm:
            print(f"[{game_id}] missing away_pm_name/home_pm_name; skipping")
            continue

        found = find_moneyline(event, away_pm, home_pm, game.get("away_full"), game.get("home_full"))
        if not found:
            print(f"[{game_id}] moneyline market not found in event {event.get('id')}")
            continue

        away_price, home_price = found
        away_odds = price_to_cents(away_price)
        home_odds = price_to_cents(home_price)
        if away_odds is None or home_odds is None:
            print(f"[{game_id}] unparseable prices: {away_price}, {home_price}")
            continue

        away_key = f"{game['away']}_win_odds"
        home_key = f"{game['home']}_win_odds"
        old_away = game.get(away_key)
        old_home = game.get(home_key)
        game[away_key] = away_odds
        game[home_key] = home_odds
        new_updated_at = event.get("updatedAt") or datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        changed = old_away != away_odds or old_home != home_odds or game.get("lastUpdated") != new_updated_at
        game["lastUpdated"] = new_updated_at

        # Append to odds history for charting when the snapshot changes.
        if changed:
            history = game.setdefault("odds_history", [])
            snapshot = {
                "timestamp": new_updated_at,
                away_key: away_odds,
                home_key: home_odds,
            }
            if not history or history[-1] != snapshot:
                history.append(snapshot)
            print(f"[{game_id}] {away_key}: {old_away} -> {away_odds} | {home_key}: {old_home} -> {home_odds} | lastUpdated: {game['lastUpdated']}")
            updated += 1
        else:
            print(f"[{game_id}] no odds change; lastUpdated: {game['lastUpdated']}")

    if selected == 0:
        if args.game_id or args.week is not None:
            print("No games matched the requested filters.")
            return 1
        print("No games matched the requested filters (live mode: no games in gametime window).")
        return 0

    if updated == 0:
        print(f"No NFL odds changes for {selected} selected game(s) in {YAML_PATH} (mode={args.mode}; skipped_live={skipped_live}; skipped_recent={skipped_recent}; missing_slug={missing_slug}; fetch_failures={fetch_failures}); skipping write")
        return 0

    from fetch_utils import atomic_write_text
    rendered = yaml.safe_dump(doc, sort_keys=False, allow_unicode=True, width=1000)
    atomic_write_text(YAML_PATH, rendered)

    print(f"Refreshed odds for {updated} of {selected} selected game(s) in {YAML_PATH} (mode={args.mode}; skipped_live={skipped_live}; skipped_recent={skipped_recent}; missing_slug={missing_slug}; fetch_failures={fetch_failures})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
