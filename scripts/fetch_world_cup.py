#!/usr/bin/env python3
"""
Fetch live FIFA World Cup 2026 scores from football-data.org API
Updates json/world-cup.json with current match data
Requires API key from https://www.football-data.org/
"""

import json
import requests
import os
from datetime import datetime, timedelta
from pathlib import Path

# football-data.org API endpoint for World Cup
API_KEY = os.environ.get('FOOTBALL_DATA_API_KEY', '')
API_URL = "https://api.football-data.org/v4/competitions/WC/matches"
AUTH_HEADER = 'X-Auth-Token'

# Output file path
OUTPUT_FILE = Path(__file__).parent.parent / "json" / "world-cup.json"

# Country flag emoji mapping
FLAG_EMOJIS = {
    'Argentina': '🇦🇷',
    'France': '🇫🇷',
    'Brazil': '🇧🇷',
    'Germany': '🇩🇪',
    'Spain': '🇪🇸',
    'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'Portugal': '🇵🇹',
    'Netherlands': '🇳🇱',
    'Italy': '🇮🇹',
    'Belgium': '🇧🇪',
    'Croatia': '🇭🇷',
    'Morocco': '🇲🇦',
    'Japan': '🇯🇵',
    'South Korea': '🇰🇷',
    'USA': '🇺🇸',
    'United States': '🇺🇸',
    'Mexico': '🇲🇽',
    'Canada': '🇨🇦',
    'South Africa': '��🇦',
    'Czechia': '🇨🇿',
    'Bosnia-Herzegovina': '🇧🇦',
    'Paraguay': '🇵🇾',
    'Qatar': '🇶🇦',
    'Switzerland': '🇨🇭',
    'Haiti': '🇭🇹',
    'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    'Australia': '🇦🇺',
    'Turkey': '🇹🇷',
    'Curaçao': '🇨🇼',
    'Ivory Coast': '🇨🇮',
    'Ecuador': '🇪🇨',
    'Sweden': '🇸🇪',
    'Tunisia': '🇹🇳',
    'Cape Verde Islands': '🇨🇻',
    'Egypt': '🇪🇬',
    'Saudi Arabia': '🇸🇦',
    'Uruguay': '🇺🇾',
    'Iran': '🇮🇷',
    'New Zealand': '🇳🇿',
    'Senegal': '🇸🇳',
    'Iraq': '🇮🇶',
    'Norway': '🇳🇴',
    'Algeria': '🇩🇿',
    'Austria': '🇦🇹',
    'Jordan': '🇯🇴',
    'Congo DR': '🇨🇩',
    'Ghana': '🇬🇭',
    'Panama': '🇵🇦',
    'Uzbekistan': '🇺🇿',
    'Colombia': '🇨🇴',
}

def get_flag(team_name):
    """Get flag emoji for team name"""
    return FLAG_EMOJIS.get(team_name, '🏳️')

def fetch_world_cup_matches():
    """Fetch World Cup match data from football-data.org API"""
    if not API_KEY:
        print("Error: FOOTBALL_DATA_API_KEY environment variable not set")
        print("Get a free API key from https://www.football-data.org/")
        return None
    
    headers = {
        AUTH_HEADER: API_KEY
    }
    
    try:
        response = requests.get(API_URL, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
        print(f"Fetched {len(data.get('matches', []))} World Cup matches")
        return data
    except requests.RequestException as e:
        print(f"Error fetching football data: {e}")
        return None

def parse_football_data(api_data):
    """Parse football-data.org response into our match format"""
    if not api_data or 'matches' not in api_data:
        return []
    
    matches = []
    api_matches = api_data['matches']
    
    for match in api_matches:
        try:
            # Extract match data
            match_id = match.get('id', '')
            home_team = match.get('homeTeam', {}).get('name', '')
            away_team = match.get('awayTeam', {}).get('name', '')
            score = match.get('score', {})
            half_time_home_score = score.get('halfTime', {}).get('home')
            half_time_away_score = score.get('halfTime', {}).get('away')
            full_time_home_score = score.get('fullTime', {}).get('home')
            full_time_away_score = score.get('fullTime', {}).get('away')
            home_score = full_time_home_score
            away_score = full_time_away_score
            status = match.get('status', '')
            match_date = match.get('utcDate', '')
            venue = match.get('venue', '')
            stage = match.get('stage', '')
            
            # Map status to our format
            if status in {'IN_PLAY', 'TIMED', 'PAUSED'}:
                status_text = 'live'
                if 'minute' in match:
                    time_text = f"{match.get('minute')}'"
                else:
                    time_text = f"{half_time_home_score or 0}-{half_time_away_score or 0} HT"
            elif status == 'SCHEDULED':
                status_text = 'upcoming'
                time_text = match_date.split('T')[1][:5] if 'T' in match_date else 'TBD'
            elif status == 'FINISHED':
                status_text = 'finished'
                time_text = '90\''
            elif status in {'SUSPENDED', 'POSTPONED', 'CANCELLED', 'AWARDED'}:
                status_text = 'upcoming'
                time_text = 'TBD'
            else:
                status_text = 'upcoming'
                time_text = 'TBD'
            
            match_data = {
                "id": f"wc2026-{match_id}",
                "teamA": {
                    "name": home_team,
                    "flag": get_flag(home_team),
                    "score": home_score
                },
                "teamB": {
                    "name": away_team,
                    "flag": get_flag(away_team),
                    "score": away_score
                },
                "status": status_text,
                "time": time_text,
                "date": match_date.split('T')[0] if 'T' in match_date else match_date,
                "utcDate": match_date,
                "venue": venue,
                "stage": stage,
                "source": "football-data.org",
                "url": "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures?country=US&wtw-filter=ALL",
                "explanation": f"World Cup 2026 {stage} match between {home_team} and {away_team} at {venue}."
            }
            
            matches.append(match_data)
            
        except Exception as e:
            print(f"Error parsing match {match.get('id', 'unknown')}: {e}")
            continue
    
    return matches

def update_world_cup_json(matches):
    """Update world-cup.json with fetched matches"""
    output_data = {
        "matches": matches,
        "lastUpdated": datetime.utcnow().isoformat() + 'Z'
    }
    
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"Updated {OUTPUT_FILE} with {len(matches)} matches")

def main():
    """Main function to fetch and update World Cup data"""
    print("Fetching World Cup 2026 data from football-data.org...")
    api_data = fetch_world_cup_matches()
    
    if not api_data:
        print("Failed to fetch football data")
        return 1
    
    matches = parse_football_data(api_data)
    update_world_cup_json(matches)
    print(f"Successfully updated with {len(matches)} matches")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())


def test_parse_football_data():
    sample = {
        'matches': [
            {
                'id': 1,
                'homeTeam': {'name': 'Home'},
                'awayTeam': {'name': 'Away'},
                'status': 'IN_PLAY',
                'minute': 67,
                'score': {
                    'halfTime': {'home': 1, 'away': 0},
                    'fullTime': {'home': None, 'away': None},
                },
                'utcDate': '2026-06-12T00:00:00Z',
                'venue': 'Stadium',
                'stage': 'GROUP_STAGE',
            },
            {
                'id': 2,
                'homeTeam': {'name': 'Home'},
                'awayTeam': {'name': 'Away'},
                'status': 'FINISHED',
                'score': {
                    'halfTime': {'home': 0, 'away': 1},
                    'fullTime': {'home': 2, 'away': 1},
                },
                'utcDate': '2026-06-12T00:00:00Z',
                'venue': 'Stadium',
                'stage': 'GROUP_STAGE',
            },
        ]
    }

    parsed = parse_football_data(sample)
    assert parsed[0]['status'] == 'live'
    assert parsed[0]['time'] == "67'"
    assert parsed[0]['teamA']['score'] is None
    assert parsed[1]['status'] == 'finished'
    assert parsed[1]['teamA']['score'] == 2
    assert parsed[1]['teamB']['score'] == 1
