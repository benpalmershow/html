#!/usr/bin/env python3
"""
Fetch LIVE win odds for NFL games from Polymarket and refresh json/nfl-games.yml.

Mirrors scripts/fetch_world_cup.py: a scheduled script polls a public API and
rewrites the data file. No NFL.com/ESPN scraping - the NFL owns its schedule
and broadcast footage, so official NFL sites are off-limits. Polymarket is a
CFTC-regulated prediction-market exchange (not an NFL data feed), so its odds
are public, machine-readable, and free of NFL intellectual property.

Usage:
    python3 scripts/fetch-nfl-odds.py [--game-id ne-sea-2026-09-09]

For each game with a polymarket_slug, this queries:
    https://gamma-api.polymarket.com/events?slug=<slug>
and rewrites the <TEAM>_win_odds fields from the moneyline market's
outcomePrices (e.g. "0.385" -> "38.5¢"). The `lastUpdated` field is set to the
event's updatedAt timestamp. All other YAML content is preserved.

The moneyline market is identified as the event market whose outcomes are
exactly the two team labels and whose question is "<Away> vs. <Home>" with no
suffix (spreads and O/U totals have suffixes like "O/U 44.5" or "Spread").
"""

import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

try:
    import yaml
except ImportError:
    print("PyYAML is required. Install with: pip install pyyaml")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
YAML_PATH = ROOT / "json" / "nfl-games.yml"
GAMMA_BASE = "https://gamma-api.polymarket.com/events"


def only_game():
    return sys.argv[sys.argv.index("--game-id") + 1] if "--game-id" in sys.argv else None


def fetch_event(slug):
    url = f"{GAMMA_BASE}?slug={urllib.parse.quote(slug)}"
    req = urllib.request.Request(url, headers={"User-Agent": "howdy-stranger-nfl-odds/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def price_to_cents(price_str):
    """0.385 -> '38.5¢' ; 0.4 -> '40.0¢'."""
    try:
        value = float(price_str)
    except (TypeError, ValueError):
        return None
    cents = round(value * 100, 1)
    return f"{cents:.1f}¢"


def _parse_json_list(value):
    """Polymarket returns list fields as JSON-encoded strings, e.g.
    outcomes='["Patriots", "Seahawks"]' and outcomePrices='["0.385", "0.615"]'.
    Parse both transparently."""
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
    """Return (away_price, home_price) from the full-game moneyline market, or None.

    The full-game moneyline is the market with sportsMarketType == "moneyline"
    (quarter/half moneylines are suffixed q1_moneyline, q2_moneyline, etc.).
    """
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
    only = only_game()
    if not YAML_PATH.exists():
        print(f"YAML file not found: {YAML_PATH}")
        return 1

    with open(YAML_PATH, "r") as f:
        doc = yaml.safe_load(f) or {}
    games = doc.setdefault("games", [])

    updated = 0
    for game in games:
        game_id = game.get("id")
        if only and game_id != only:
            continue
        slug = game.get("polymarket_slug")
        if not slug:
            print(f"[{game_id}] no polymarket_slug; skipping")
            continue

        try:
            events = fetch_event(slug)
        except (urllib.error.URLError, urllib.error.HTTPError) as e:
            print(f"[{game_id}] API error for slug {slug}: {e}")
            continue
        except Exception as e:
            print(f"[{game_id}] unexpected error: {e}")
            continue

        if not events:
            print(f"[{game_id}] no event for slug {slug}")
            continue
        event = events[0]

        away_pm = game.get("away_pm_name")
        home_pm = game.get("home_pm_name")
        if not away_pm or not home_pm:
            print(f"[{game_id}] missing away_pm_name/home_pm_name; skipping")
            continue

        found = find_moneyline(event, away_pm, home_pm)
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
        game["lastUpdated"] = event.get("updatedAt") or datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

        print(f"[{game_id}] {away_key}: {old_away} -> {away_odds} | {home_key}: {old_home} -> {home_odds} | lastUpdated: {game['lastUpdated']}")
        updated += 1

    with open(YAML_PATH, "w") as f:
        yaml.safe_dump(doc, f, sort_keys=False, allow_unicode=True, width=1000)

    print(f"Updated {updated} game(s) in {YAML_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())