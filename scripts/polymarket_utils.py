"""Shared Polymarket API helpers for NFL odds scripts."""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

GAMMA_BASE = "https://gamma-api.polymarket.com/events"


def fetch_event(slug, max_retries=3, timeout=30, user_agent="howdy-stranger-nfl-odds/1.0"):
    """Fetch event data from Polymarket gamma API with retry logic."""
    url = f"{GAMMA_BASE}?slug={urllib.parse.quote(slug)}"
    req = urllib.request.Request(url, headers={"User-Agent": user_agent})
    last_err = None
    for attempt in range(max_retries):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except (urllib.error.URLError, urllib.error.HTTPError) as e:
            last_err = e
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt
                time.sleep(wait_time)
        except Exception as e:
            last_err = e
            raise
    raise last_err


def price_to_cents(price_str):
    """0.385 -> '38.5¢' ; 0.4 -> '40.0¢'."""
    try:
        value = float(price_str)
    except (TypeError, ValueError):
        return None
    cents = round(value * 100, 1)
    return f"{cents:.1f}¢"


def parse_game_time_iso(value):
    if not value:
        return None
    try:
        if value.endswith("Z"):
            value = value[:-1] + "+00:00"
        return datetime.fromisoformat(value)
    except Exception:
        return None


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


def _names_match(outcome, name, full=None):
    o = outcome.strip().lower()
    n = name.strip().lower()
    if o == n:
        return True
    if full:
        f = full.strip().lower()
        if o == f or o in f.split():
            return True
    return False


def find_moneyline(event, away_name, home_name, away_full=None, home_full=None):
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
        away_idx = home_idx = None
        for i, outcome in enumerate(outcomes):
            if _names_match(outcome, away_name, away_full):
                away_idx = i
            elif _names_match(outcome, home_name, home_full):
                home_idx = i
        if away_idx is None or home_idx is None or away_idx == home_idx:
            continue
        return prices[away_idx], prices[home_idx]
    return None
