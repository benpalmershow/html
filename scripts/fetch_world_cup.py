#!/usr/bin/env python3
"""
Fetch live FIFA World Cup 2026 scores from football-data.org API
Updates json/world-cup.json with comprehensive match data
Requires API key from https://www.football-data.org/
"""

import json
import requests
import os
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential

# Load environment variables from .env file
load_dotenv()

# Setup logging
log_dir = Path("logs")
log_dir.mkdir(exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_dir / "fetch_world_cup.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

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
    'South Africa': '🇿🇦',
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

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def fetch_world_cup_matches():
    """Fetch World Cup match data from football-data.org API with retry logic"""
    if not API_KEY:
        logger.error("FOOTBALL_DATA_API_KEY environment variable not set")
        logger.info("Get a free API key from https://www.football-data.org/")
        return None
    
    headers = {
        AUTH_HEADER: API_KEY
    }
    
    try:
        logger.info(f"Fetching World Cup matches from {API_URL}")
        response = requests.get(API_URL, headers=headers, timeout=30)
        
        # Handle rate limiting
        if response.status_code == 429:
            logger.warning("Rate limited by football-data.org API")
            raise requests.RequestException("Rate limited (429)")
        
        response.raise_for_status()
        data = response.json()
        logger.info(f"Successfully fetched {len(data.get('matches', []))} World Cup matches")
        return data
    except requests.RequestException as e:
        logger.error(f"Error fetching football data: {e}")
        raise

def parse_football_data(api_data):
    """Parse football-data.org response into comprehensive match format"""
    if not api_data or 'matches' not in api_data:
        logger.warning("Invalid API response structure")
        return []

    matches = []
    api_matches = api_data['matches']
    now = datetime.now(timezone.utc)

    for match in api_matches:
        try:
            # Extract match data
            match_id = match.get('id', '')
            home_team = match.get('homeTeam', {})
            away_team = match.get('awayTeam', {})
            score = match.get('score', {})
            
            # Score details
            half_time_home_score = score.get('halfTime', {}).get('home')
            half_time_away_score = score.get('halfTime', {}).get('away')
            full_time_home_score = score.get('fullTime', {}).get('home')
            full_time_away_score = score.get('fullTime', {}).get('away')
            extra_time_home = score.get('extraTime', {}).get('home')
            extra_time_away = score.get('extraTime', {}).get('away')
            penalties_home = score.get('penalties', {}).get('home')
            penalties_away = score.get('penalties', {}).get('away')
            
            home_team_name = home_team.get('name', '')
            away_team_name = away_team.get('name', '')
            status = match.get('status', '')
            match_date = match.get('utcDate', '')
            venue = match.get('venue', '')
            if isinstance(venue, dict):
                venue = venue.get('name', '') or venue.get('city', '')
            stage = match.get('stage', '')
            group = match.get('group', '')
            match_day = match.get('matchday')
            winner = score.get('winner')
            
            # Referees
            referees = match.get('referees', [])
            referee_names = [ref.get('name', '') for ref in referees]

            # Map status to our format
            if status in {'IN_PLAY', 'PAUSED', 'EXTRA_TIME', 'PENALTY_SHOOTOUT'}:
                status_text = 'live'
                if 'minute' in match:
                    time_text = f"{match.get('minute')}'"
                else:
                    time_text = f"{half_time_home_score or 0}-{half_time_away_score or 0} HT"
            elif status == 'TIMED':
                status_text = 'upcoming'
                time_text = match_date.split('T')[1][:5] if 'T' in match_date else 'TBD'
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

            # Auto-update status for games that should have finished
            if match_date and status_text in ['upcoming', 'live']:
                try:
                    match_datetime = datetime.fromisoformat(match_date.replace('Z', '+00:00'))
                    # Add 3 hours to account for typical match duration
                    match_end_time = match_datetime + timedelta(hours=3)
                    if now > match_end_time:
                        status_text = 'finished'
                        time_text = '90\''
                except (ValueError, TypeError):
                    pass
            
            match_data = {
                "id": f"wc2026-{match_id}",
                "matchId": match_id,
                "teamA": {
                    "id": home_team.get('id'),
                    "name": home_team_name,
                    "flag": get_flag(home_team_name),
                    "crest": home_team.get('crest'),
                    "score": full_time_home_score,
                    "halfTimeScore": half_time_home_score,
                    "extraTimeScore": extra_time_home,
                    "penaltyScore": penalties_home,
                },
                "teamB": {
                    "id": away_team.get('id'),
                    "name": away_team_name,
                    "flag": get_flag(away_team_name),
                    "crest": away_team.get('crest'),
                    "score": full_time_away_score,
                    "halfTimeScore": half_time_away_score,
                    "extraTimeScore": extra_time_away,
                    "penaltyScore": penalties_away,
                },
                "status": status_text,
                "statusRaw": status,
                "time": time_text,
                "minute": match.get('minute'),
                "date": match_date.split('T')[0] if 'T' in match_date else match_date,
                "utcDate": match_date,
                "venue": venue,
                "stage": stage,
                "group": group,
                "matchDay": match_day,
                "winner": winner,
                "referees": referee_names,
                "source": "FIFA",
                "url": "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures",
                "explanation": f"World Cup 2026 {stage} match between {home_team_name} and {away_team_name}" + 
                              (f" ({group})" if group else "") +
                              (f" at {venue}" if venue else "")
            }
            
            matches.append(match_data)
            
        except Exception as e:
            logger.error(f"Error parsing match {match.get('id', 'unknown')}: {e}")
            continue
    
    return matches

def update_world_cup_json(matches):
    """Update world-cup.json with fetched matches"""
    output_data = {
        "competition": "FIFA World Cup 2026",
        "matches": matches,
        "matchCount": len(matches),
        "lastUpdated": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    }
    
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    
    logger.info(f"Updated {OUTPUT_FILE} with {len(matches)} matches")

def main():
    """Main function to fetch and update World Cup data"""
    logger.info("Starting World Cup 2026 data fetch from football-data.org...")
    try:
        api_data = fetch_world_cup_matches()
        
        if not api_data:
            logger.error("Failed to fetch football data")
            return 1
        
        matches = parse_football_data(api_data)
        update_world_cup_json(matches)
        logger.info(f"Successfully updated with {len(matches)} matches")
        return 0
    except Exception as e:
        logger.error(f"Unexpected error in main: {e}")
        return 1

if __name__ == "__main__":
    raise SystemExit(main())


def test_parse_football_data():
    """Test function for parse_football_data"""
    sample = {
        'matches': [
            {
                'id': 1,
                'homeTeam': {'id': 1, 'name': 'Home', 'crest': 'https://example.com/home.png'},
                'awayTeam': {'id': 2, 'name': 'Away', 'crest': 'https://example.com/away.png'},
                'status': 'IN_PLAY',
                'minute': 67,
                'score': {
                    'winner': None,
                    'halfTime': {'home': 1, 'away': 0},
                    'fullTime': {'home': None, 'away': None},
                    'extraTime': {'home': None, 'away': None},
                    'penalties': {'home': None, 'away': None},
                },
                'utcDate': '2026-06-25T00:00:00Z',
                'venue': 'Stadium',
                'stage': 'GROUP_STAGE',
                'group': 'Group A',
                'matchday': 1,
                'referees': [{'id': 100, 'name': 'John Doe', 'nationality': 'England'}],
            },
            {
                'id': 2,
                'homeTeam': {'id': 3, 'name': 'Home', 'crest': 'https://example.com/home.png'},
                'awayTeam': {'id': 4, 'name': 'Away', 'crest': 'https://example.com/away.png'},
                'status': 'FINISHED',
                'score': {
                    'winner': 'HOME_TEAM',
                    'halfTime': {'home': 0, 'away': 1},
                    'fullTime': {'home': 2, 'away': 1},
                    'extraTime': {'home': None, 'away': None},
                    'penalties': {'home': None, 'away': None},
                },
                'utcDate': '2026-06-25T00:00:00Z',
                'venue': 'Stadium',
                'stage': 'GROUP_STAGE',
                'group': 'Group A',
                'matchday': 1,
                'referees': [],
            },
        ]
    }

    parsed = parse_football_data(sample)
    assert parsed[0]['status'] == 'live'
    assert parsed[0]['time'] == "67'"
    assert parsed[0]['teamA']['score'] is None
    assert parsed[0]['teamB']['halfTimeScore'] == 0
    assert parsed[0]['referees'] == ['John Doe']
    assert parsed[1]['status'] == 'finished'
    assert parsed[1]['teamA']['score'] == 2
    assert parsed[1]['teamB']['score'] == 1
    assert parsed[1]['winner'] == 'HOME_TEAM'
    assert parsed[1]['group'] == 'Group A'
    print("All tests passed!")
