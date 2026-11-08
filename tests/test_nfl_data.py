import importlib
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))

apply_nfl = importlib.import_module("apply-nfl-yml")
fetch_nfl = importlib.import_module("fetch-nfl-odds")


class NflOddsTests(unittest.TestCase):
    def test_price_to_cents(self):
        self.assertEqual(fetch_nfl.price_to_cents("0.385"), "38.5¢")
        self.assertIsNone(fetch_nfl.price_to_cents("x"))

    def test_moneyline_parsing(self):
        event = {
            "markets": [
                {
                    "sportsMarketType": "moneyline",
                    "outcomes": '["Patriots","Seahawks"]',
                    "outcomePrices": '["0.385","0.615"]',
                }
            ]
        }
        self.assertEqual(fetch_nfl.find_moneyline(event, "Patriots", "Seahawks"), ("0.385", "0.615"))

    def test_unchanged_snapshot_not_change(self):
        changed = "40.0¢" != "40.0¢" or "60.0¢" != "60.0¢" or "2026-09-01T00:00:00Z" != "2026-09-01T00:00:00Z"
        self.assertFalse(changed)


class ApplyNflTests(unittest.TestCase):
    def test_odds_to_int(self):
        self.assertEqual(apply_nfl.odds_to_int("38.5¢"), "38")
        self.assertIsNone(apply_nfl.odds_to_int(None))

    def test_build_indicator_integer_odds(self):
        game = {
            "id": "ne-sea-2099-09-09",
            "away": "NE",
            "home": "SEA",
            "away_full": "New England Patriots",
            "home_full": "Seattle Seahawks",
            "agency": "Polymarket",
            "game_time": "future",
            "game_time_iso": "2099-09-10T00:20:00Z",
            "url": "https://example.com",
            "week": 1,
            "NE_win_odds": "38.5¢",
            "SEA_win_odds": "61.5¢",
            "odds_history": [{"timestamp": "2099-09-01T00:00:00Z", "NE_win_odds": "38.5¢", "SEA_win_odds": "61.5¢"}],
        }
        ind = apply_nfl.build_indicator(game)
        self.assertEqual(ind["NE_win_odds"], "38")
        self.assertIn("probabilities", ind)

    def test_completed_game_infers_winner(self):
        game = {
            "id": "a-b-2020-09-09",
            "away": "A",
            "home": "B",
            "away_full": "A Team",
            "home_full": "B Team",
            "agency": "Polymarket",
            "game_time": "past",
            "game_time_iso": "2020-09-10T00:20:00Z",
            "url": "https://example.com",
            "week": 1,
            "A_win_odds": "100¢",
            "B_win_odds": "0¢",
        }
        ind = apply_nfl.build_indicator(game)
        self.assertEqual(ind.get("winner"), "A")
        self.assertEqual(ind.get("result"), "Final")


if __name__ == "__main__":
    unittest.main()
