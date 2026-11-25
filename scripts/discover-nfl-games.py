#!/usr/bin/env python3
"""
Best-effort discovery of current NFL games from Polymarket's sports page.

Appends any games found on Polymarket that are missing from data/nfl-games.yml.
New entries are added WITHOUT odds (polymarket_slug, teams, time, week are set;
_win_odds fields are left absent) so the odds fetcher can populate them next.

The Polymarket /sports/nfl page renders the current week's games server-side,
so this works for upcoming/current weeks. Completed weeks (e.g. week 11 once
games have been played) will not appear on the page and cannot be
auto-discovered here. Treat discovery as best-effort: review added entries
before committing.

Usage:
    python3 scripts/discover-nfl-games.py [--dry-run]
"""

from __future__ import annotations

import argparse
import re
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

try:
    import yaml
except ImportError:
    print("PyYAML is required. Install with: pip install pyyaml")
    raise SystemExit(1)

ROOT = Path(__file__).resolve().parent.parent
YAML_PATH = ROOT / "data" / "nfl-games.yml"
POLYPAGE_URL = "https://polymarket.com/sports/nfl"

# NFL season 2026: week 1 kicks off Thursday 2026-09-10.
SEASON_START = datetime(2026, 9, 10, tzinfo=timezone.utc)
SEASON_END = datetime(2027, 2, 28, tzinfo=timezone.utc)

# Team abbreviation -> full name (authoritative, from existing YAML).
ABBREV_TO_FULL = {
    "ARI": "Arizona Cardinals",
    "ATL": "Atlanta Falcons",
    "BAL": "Baltimore Ravens",
    "BUF": "Buffalo Bills",
    "CAR": "Carolina Panthers",
    "CHI": "Chicago Bears",
    "CIN": "Cincinnati Bengals",
    "CLE": "Cleveland Browns",
    "DAL": "Dallas Cowboys",
    "DEN": "Denver Broncos",
    "DET": "Detroit Lions",
    "GB": "Green Bay Packers",
    "HOU": "Houston Texans",
    "IND": "Indianapolis Colts",
    "JAX": "Jacksonville Jaguars",
    "KC": "Kansas City Chiefs",
    "LV": "Las Vegas Raiders",
    "LAC": "Los Angeles Chargers",
    "LAR": "Los Angeles Rams",
    "MIA": "Miami Dolphins",
    "MIN": "Minnesota Vikings",
    "NE": "New England Patriots",
    "NO": "New Orleans Saints",
    "NYG": "New York Giants",
    "NYJ": "New York Jets",
    "PHI": "Philadelphia Eagles",
    "PIT": "Pittsburgh Steelers",
    "SF": "San Francisco 49ers",
    "SEA": "Seattle Seahawks",
    "TB": "Tampa Bay Buccaneers",
    "TEN": "Tennessee Titans",
    "WAS": "Washington Commanders",
}

# Slug pattern: /sports/nfl/nfl-<away>-<home>-<YYYY-MM-DD>
SLUG_RE = re.compile(r"/sports/nfl/nfl-([a-z]+)-([a-z]+)-(\d{4}-\d{2}-\d{2})")

# Polymarket slug abbreviation -> canonical team abbreviation.
# Some slugs use short forms (e.g. "la" for Rams vs "lac" for Chargers).
SLUG_ABBREV_MAP = {
    "la": "LAR",
}


def load_yaml():
    if not YAML_PATH.exists():
        return {"games": []}
    with open(YAML_PATH, "r") as f:
        return yaml.safe_load(f) or {"games": []}


def save_yaml(doc, dry_run=False):
    rendered = yaml.safe_dump(doc, sort_keys=False, allow_unicode=True, width=1000)
    if dry_run:
        print("--- dry run: YAML would be written ---")
        print(rendered)
        return
    from fetch_utils import atomic_write_text
    atomic_write_text(YAML_PATH, rendered)


def abbrev_full(abbr):
    """Return (abbrev, full_name) for a team abbreviation, or (None, None)."""
    abbr = abbr.upper()
    # Resolve slug shorthand (e.g. "la" -> "LAR") before looking up full name.
    abbr = SLUG_ABBREV_MAP.get(abbr.lower(), abbr)
    full = ABBREV_TO_FULL.get(abbr)
    if not full:
        return None, None
    return abbr, full


def parse_iso(value):
    if not value:
        return None
    try:
        if value.endswith("Z"):
            value = value[:-1] + "+00:00"
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def nfl_week(game_dt):
    """Compute NFL week (1-based) from a game datetime. Week 1 = first Thursday
    on/after SEASON_START; a game's week is the week of the Thursday on or
    before its date."""
    if game_dt is None:
        return None
    thursday = game_dt
    while thursday.weekday() != 3:
        thursday -= timedelta(days=1)
    thursday = thursday.replace(hour=0, minute=0, second=0, microsecond=0)
    if thursday < SEASON_START.replace(hour=0, minute=0, second=0, microsecond=0):
        thursday = SEASON_START.replace(hour=0, minute=0, second=0, microsecond=0)
    return ((thursday - SEASON_START).days // 7) + 1


def fetch_polymarket_page(timeout=30):
    """Fetch the Polymarket NFL sports page HTML."""
    req = urllib.request.Request(
        POLYPAGE_URL,
        headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read().decode("utf-8")
    except (urllib.error.URLError, urllib.error.HTTPError) as e:
        print(f"  Polymarket page fetch error: {e}")
        return None


def extract_game_links(html):
    """Extract unique (away_abbr, home_abbr, date_str) tuples from page HTML."""
    found = set()
    for m in SLUG_RE.finditer(html):
        away = m.group(1).upper()
        home = m.group(2).upper()
        date_str = m.group(3)
        found.add((away, home, date_str))
    return found


def main(dry_run=False):
    doc = load_yaml()
    games = doc.setdefault("games", [])

    # Index existing entries by slug and by (away, home, date) to avoid dupes.
    existing_slugs = {g.get("polymarket_slug") for g in games if g.get("polymarket_slug")}
    existing_keys = {
        (g.get("away"), g.get("home"), g.get("game_time_iso")) for g in games
    }

    html = fetch_polymarket_page()
    if html is None:
        print("  Could not fetch Polymarket page; aborting.")
        return 1

    links = extract_game_links(html)
    print(f"  Found {len(links)} unique game link(s) on Polymarket NFL page.")

    added = 0
    for away, home, date_str in sorted(links):
        away_abbr, away_full = abbrev_full(away)
        home_abbr, home_full = abbrev_full(home)
        if not away_abbr or not home_abbr:
            print(f"  could not map {away}/{home} to full name; skipping")
            continue

        try:
            game_dt = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except ValueError:
            print(f"  could not parse date {date_str}; skipping")
            continue

        if game_dt < SEASON_START or game_dt > SEASON_END:
            continue

        week = nfl_week(game_dt)
        game_time = game_dt.strftime("%b %d, %Y %-I:%M %p ET")
        game_time_iso = game_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

        slug = f"nfl-{away.lower()}-{home.lower()}-{date_str}"
        game_id = f"{away.lower()}-{home.lower()}-{date_str}"

        if slug in existing_slugs:
            continue
        if (away_abbr, home_abbr, game_time_iso) in existing_keys:
            continue

        new_game = {
            "id": game_id,
            "week": week,
            "away": away_abbr,
            "home": home_abbr,
            "away_full": away_full,
            "home_full": home_full,
            "away_pm_name": away_abbr,
            "home_pm_name": home_abbr,
            "game_time": game_time,
            "game_time_iso": game_time_iso,
            "url": f"https://polymarket.com/sports/nfl/{slug}",
            "polymarket_slug": slug,
        }
        games.append(new_game)
        existing_slugs.add(slug)
        existing_keys.add((away_abbr, home_abbr, game_time_iso))
        added += 1
        print(f"  + {away_abbr} @ {home_abbr} ({date_str}) week {week} -> {slug}")

    print(f"\nScanned Polymarket NFL page; added {added} new game(s).")
    save_yaml(doc, dry_run=dry_run)
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Discover missing NFL games from Polymarket and add to data/nfl-games.yml.")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without writing YAML")
    args = parser.parse_args()
    raise SystemExit(main(dry_run=args.dry_run))
