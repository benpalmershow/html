#!/usr/bin/env python3
"""Add missing NFL games from Polymarket to nfl-games.yml"""

import yaml
from datetime import datetime, timezone

ROOT = __file__.replace('scripts/add-missing-nfl-games.py', '')
YAML_PATH = ROOT + 'data/nfl-games.yml'

# Team name to code mapping
TEAM_MAP = {
    'Bills': 'BUF', 'Vikings': 'MIN', 'Falcons': 'ATL', 'Ravens': 'BAL',
    'Texans': 'HOU', 'Packers': 'GB', 'Rams': 'LA', 'Bears': 'CHI',
    'Lions': 'DET', 'Chiefs': 'KC', 'Broncos': 'DEN', 'Steelers': 'PIT',
    'Patriots': 'NE', 'Chargers': 'LAC', 'Saints': 'NO', 'Bengals': 'CIN',
    'Seahawks': 'SEA', '49ers': 'SF', 'Raiders': 'LV', 'Browns': 'CLE',
    'Jets': 'NYJ', 'Dolphins': 'MIA', 'Giants': 'NYG', 'Colts': 'IND',
    'Eagles': 'PHI', 'Cowboys': 'DAL', 'Panthers': 'CAR', 'Cardinals': 'ARI',
    'Commanders': 'WAS', 'Titans': 'TEN', 'Jaguars': 'JAX', 'Buccaneers': 'TB',
}

TEAM_FULL = {
    'BUF': 'Buffalo Bills', 'MIN': 'Minnesota Vikings', 'ATL': 'Atlanta Falcons',
    'BAL': 'Baltimore Ravens', 'HOU': 'Houston Texans', 'GB': 'Green Bay Packers',
    'LA': 'Los Angeles Rams', 'CHI': 'Chicago Bears', 'DET': 'Detroit Lions',
    'KC': 'Kansas City Chiefs', 'DEN': 'Denver Broncos', 'PIT': 'Pittsburgh Steelers',
    'NE': 'New England Patriots', 'LAC': 'Los Angeles Chargers', 'NO': 'New Orleans Saints',
    'CIN': 'Cincinnati Bengals', 'SEA': 'Seattle Seahawks', 'SF': 'San Francisco 49ers',
    'LV': 'Las Vegas Raiders', 'CLE': 'Cleveland Browns', 'NYJ': 'New York Jets',
    'MIA': 'Miami Dolphins', 'NYG': 'New York Giants', 'IND': 'Indianapolis Colts',
    'PHI': 'Philadelphia Eagles', 'DAL': 'Dallas Cowboys', 'CAR': 'Carolina Panthers',
    'ARI': 'Arizona Cardinals', 'WAS': 'Washington Commanders', 'TEN': 'Tennessee Titans',
    'JAX': 'Jacksonville Jaguars', 'TB': 'Tampa Bay Buccaneers',
}

# Game data from API
GAMES_DATA = [
    ("nfl-atl-min-2026-11-29", "Falcons vs. Vikings", "2026-11-29T18:00:00Z", "Falcons", "Vikings", 0.385, 0.615),
    ("nfl-bal-car-2026-11-22", "Ravens vs. Panthers", "2026-11-22T18:00:00Z", "Ravens", "Panthers", 0.375, 0.625),
    ("nfl-bal-hou-2026-11-29", "Ravens vs. Texans", "2026-11-29T18:00:00Z", "Ravens", "Texans", 0.265, 0.735),
    ("nfl-buf-nyj-2026-11-15", "Bills vs. Jets", "2026-11-15T18:00:00Z", "Bills", "Jets", 0.81, 0.19),
    ("nfl-car-no-2026-11-15", "Panthers vs. Saints", "2026-11-15T18:00:00Z", "Panthers", "Saints", 0.475, 0.525),
    ("nfl-chi-det-2026-11-26", "Bears vs. Lions", "2026-11-26T18:00:00Z", "Bears", "Lions", 0.47, 0.53),
    ("nfl-cin-was-2026-11-24", "Bengals vs. Commanders", "2026-11-24T01:15:00Z", "Bengals", "Commanders", 0.685, 0.315),
    ("nfl-den-pit-2026-11-27", "Broncos vs. Steelers", "2026-11-27T20:00:00Z", "Broncos", "Steelers", 0.535, 0.465),
    ("nfl-gb-la-2026-11-26", "Packers vs. Rams", "2026-11-26T01:00:00Z", "Packers", "Rams", 0.355, 0.645),
    ("nfl-hou-cle-2026-11-15", "Texans vs. Browns", "2026-11-15T18:00:00Z", "Texans", "Browns", 0.675, 0.325),
    ("nfl-ind-hou-2026-11-20", "Colts vs. Texans", "2026-11-20T01:15:00Z", "Colts", "Texans", 0.265, 0.735),
    ("nfl-jax-ten-2026-11-15", "Jaguars vs. Titans", "2026-11-15T18:00:00Z", "Jaguars", "Titans", 0.825, 0.175),
    ("nfl-kc-atl-2026-11-15", "Chiefs vs. Falcons", "2026-11-15T18:00:00Z", "Chiefs", "Falcons", 0.64, 0.36),
    ("nfl-kc-buf-2026-11-27", "Chiefs vs. Bills", "2026-11-27T01:20:00Z", "Chiefs", "Bills", 0.3, 0.7),
    ("nfl-la-ari-2026-11-15", "Rams vs. Cardinals", "2026-11-15T21:05:00Z", "Rams", "Cardinals", 0.79, 0.21),
    ("nfl-lac-bal-2026-11-17", "Chargers vs. Ravens", "2026-11-17T01:15:00Z", "Chargers", "Ravens", 0.315, 0.685),
    ("nfl-lv-cle-2026-11-29", "Raiders vs. Browns", "2026-11-29T18:00:00Z", "Raiders", "Browns", 0.465, 0.535),
    ("nfl-mia-buf-2026-11-22", "Dolphins vs. Bills", "2026-11-22T18:00:00Z", "Dolphins", "Bills", 0.17, 0.83),
    ("nfl-mia-ind-2026-11-15", "Dolphins vs. Colts", "2026-11-15T18:00:00Z", "Dolphins", "Colts", 0.435, 0.565),
    ("nfl-min-gb-2026-11-15", "Vikings vs. Packers", "2026-11-15T18:00:00Z", "Vikings", "Packers", 0.39, 0.61),
    ("nfl-ne-det-2026-11-15", "Patriots vs. Lions", "2026-11-15T14:30:00Z", "Patriots", "Lions", 0.415, 0.585),
    ("nfl-ne-lac-2026-11-30", "Patriots vs. Chargers", "2026-11-30T01:20:00Z", "Patriots", "Chargers", 0.685, 0.315),
    ("nfl-no-chi-2026-11-22", "Saints vs. Bears", "2026-11-22T18:00:00Z", "Saints", "Bears", 0.21, 0.79),
    ("nfl-no-cin-2026-11-29", "Saints vs. Bengals", "2026-11-29T18:00:00Z", "Saints", "Bengals", 0.235, 0.765),
    ("nfl-nyg-ind-2026-11-29", "Giants vs. Colts", "2026-11-29T18:00:00Z", "Giants", "Colts", 0.465, 0.535),
    ("nfl-nyj-mia-2026-11-29", "Jets vs. Dolphins", "2026-11-29T18:00:00Z", "Jets", "Dolphins", 0.515, 0.485),
    ("nfl-phi-dal-2026-11-26", "Eagles vs. Cowboys", "2026-11-26T21:30:00Z", "Eagles", "Cowboys", 0.295, 0.705),
    ("nfl-pit-cin-2026-11-16", "Steelers vs. Bengals", "2026-11-16T01:20:00Z", "Steelers", "Bengals", 0.36, 0.64),
    ("nfl-sea-lv-2026-11-15", "Seahawks vs. Raiders", "2026-11-15T21:05:00Z", "Seahawks", "Raiders", 0.625, 0.375),
    ("nfl-sea-sf-2026-11-29", "Seahawks vs. 49ers", "2026-11-29T21:25:00Z", "Seahawks", "49ers", 0.525, 0.475),
    ("nfl-sf-dal-2026-11-15", "49ers vs. Cowboys", "2026-11-15T21:25:00Z", "49ers", "Cowboys", 0.675, 0.325),
    ("nfl-tb-det-2026-11-22", "Buccaneers vs. Lions", "2026-11-22T18:00:00Z", "Buccaneers", "Lions", 0.355, 0.645),
    ("nfl-ten-dal-2026-11-22", "Titans vs. Cowboys", "2026-11-22T18:00:00Z", "Titans", "Cowboys", 0.215, 0.785),
    ("nfl-ten-jax-2026-11-29", "Titans vs. Jaguars", "2026-11-29T21:05:00Z", "Titans", "Jaguars", 0.18, 0.82),
    ("nfl-was-ari-2026-11-29", "Commanders vs. Cardinals", "2026-11-29T21:25:00Z", "Commanders", "Cardinals", 0.545, 0.455),
    ("nfl-was-nyg-2026-11-13", "Commanders vs. Giants", "2026-11-13T01:15:00Z", "Commanders", "Giants", 0.455, 0.545),
]

def format_game_time(dt_str):
    dt = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
    return dt.strftime('%b %d, %Y %I:%M %p ET').replace(' 0', ' ').replace('AM', 'AM').replace('PM', 'PM')

with open(YAML_PATH, 'r') as f:
    doc = yaml.safe_load(f) or {}

existing_ids = {g['id'] for g in doc.get('games', [])}
added = 0

for slug, title, endDate, away_name, home_name, away_price, home_price in GAMES_DATA:
    if slug in existing_ids:
        print(f"Skipping {slug} - already exists")
        continue

    away_code = TEAM_MAP[away_name]
    home_code = TEAM_MAP[home_name]

    # Determine week from date
    dt = datetime.fromisoformat(endDate.replace('Z', '+00:00'))
    # Rough week calculation (season starts ~Sep 7, 2026)
    week = 10 if dt.month == 11 and dt.day >= 10 else 11 if dt.month == 11 else 12

    game = {
        'id': slug,
        'week': week,
        'away': away_code,
        'home': home_code,
        'away_full': TEAM_FULL[away_code],
        'home_full': TEAM_FULL[home_code],
        'away_pm_name': away_code,
        'home_pm_name': home_code,
        'game_time': format_game_time(endDate),
        'game_time_iso': endDate,
        'url': f'https://polymarket.com/sports/nfl/{slug}',
        'polymarket_slug': slug,
        f'{away_code}_win_odds': '',
        f'{home_code}_win_odds': '',
        'lastUpdated': '',
        'odds_history': [],
    }

    doc.setdefault('games', []).append(game)
    added += 1
    print(f"Added {slug}: {away_code} @ {home_code}")

# Sort games by game_time_iso
doc['games'].sort(key=lambda g: g.get('game_time_iso', ''))

with open(YAML_PATH, 'w') as f:
    yaml.safe_dump(doc, f, sort_keys=False, allow_unicode=True, width=1000)

print(f"\nAdded {added} new games. Total games: {len(doc['games'])}")