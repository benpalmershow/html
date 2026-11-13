#!/usr/bin/env python3
"""
Fetch LIVE odds for Polymarket prediction markets and refresh json/financials-data.json.

Usage:
    python3 scripts/fetch-polymarket-odds.py [--id faa-groundstop-lifted]

For each prediction market entry with a Polymarket URL, this queries the Gamma API
and updates the probabilities field with current odds. The script handles both
binary (yes/no) and multi-outcome markets.

Only updates entries that have changed to avoid unnecessary commits.
"""

import argparse
import json
import random
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JSON_PATH = ROOT / "json" / "financials-data.json"
GAMMA_BASE = "https://gamma-api.polymarket.com/events"


def extract_slug_from_url(url):
    """Extract event slug from Polymarket URL.
    Example: https://polymarket.com/event/nationwide-ground-stop-lifted-byptptpt
    Returns: nationwide-ground-stop-lifted-byptptpt
    """
    if not url:
        return None
    # Handle both /event/ and /event/markets/ URLs
    if "/event/" in url:
        parts = url.split("/event/")
        if len(parts) > 1:
            slug = parts[1].split("?")[0].split("#")[0]
            return slug
    return None


def fetch_event(slug, max_retries=3):
    """Fetch event data with retry logic for transient failures."""
    url = f"{GAMMA_BASE}?slug={urllib.parse.quote(slug)}"
    req = urllib.request.Request(url, headers={"User-Agent": "howdy-stranger-polymarket-odds/1.0"})

    for attempt in range(max_retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except (urllib.error.URLError, urllib.error.HTTPError) as e:
            if attempt == max_retries - 1:
                raise
            wait_time = 2 ** attempt
            print(f"  [retry {attempt + 1}/{max_retries}] waiting {wait_time}s before retry...")
            time.sleep(wait_time)
        except Exception as e:
            print(f"  Unexpected error: {e}")
            raise


def price_to_cents(price_str):
    """0.385 -> '38¢' ; 0.97 -> '97¢'."""
    try:
        value = float(price_str)
    except (TypeError, ValueError):
        return None
    cents = round(value * 100)
    return f"{cents}¢"


def get_current_probabilities(event):
    """Extract current outcome prices from Polymarket event data.
    Returns dict mapping outcome labels to prices in cents.
    Handles both single markets and grouped multi-market events.
    """
    if not event or "markets" not in event:
        return {}

    markets = event.get("markets", [])
    if not markets:
        return {}

    result = {}

    # Check if this is a grouped event (multiple markets with groupItemTitle)
    # Each market represents a different time window with Yes/No outcomes
    grouped_titles = set()
    for market in markets:
        title = market.get("groupItemTitle")
        if title:
            grouped_titles.add(title)

    if len(grouped_titles) > 1:
        # This is a grouped event - extract Yes probability for each time window
        for market in markets:
            title = market.get("groupItemTitle")
            if not title:
                continue

            outcomes = market.get("outcomes", [])
            prices = market.get("outcomePrices", [])

            # Handle JSON-encoded strings
            if isinstance(outcomes, str):
                try:
                    outcomes = json.loads(outcomes)
                except (ValueError, TypeError):
                    outcomes = []
            if isinstance(prices, str):
                try:
                    prices = json.loads(prices)
                except (ValueError, TypeError):
                    prices = []

            if len(outcomes) != 2 or len(prices) != 2:
                continue

            # Find the "Yes" outcome and get its price
            for outcome, price in zip(outcomes, prices):
                if outcome.strip().lower() == "yes":
                    cents = price_to_cents(price)
                    if cents:
                        # Simplify the title for display
                    simplified_title = title.replace("November 13, ", "").replace("November 14, ", "").replace("November 15, ", "")
                    # Further simplify time format
                    simplified_title = simplified_title.replace(":00 PM ET", " PM").replace(":00 AM ET", " AM").replace("12:00 AM", "Midnight").replace("12:00 PM", "12 PM")
                    # Simplify "In 2 days" to "2 days"
                    simplified_title = simplified_title.replace("In 2 days ", "2 days")
                    result[simplified_title] = cents
                    break
    else:
        # Single market - use the first one
        market = markets[0]

        outcomes = market.get("outcomes", [])
        prices = market.get("outcomePrices", [])

        # Handle JSON-encoded strings
        if isinstance(outcomes, str):
            try:
                outcomes = json.loads(outcomes)
            except (ValueError, TypeError):
                outcomes = []
        if isinstance(prices, str):
            try:
                prices = json.loads(prices)
            except (ValueError, TypeError):
                prices = []

        if len(outcomes) != len(prices):
            return {}

        for outcome, price in zip(outcomes, prices):
            cents = price_to_cents(price)
            if cents:
                result[outcome] = cents

    return result


def should_update_entry(entry, current_time, max_age_minutes=30):
    """Check if entry should be updated based on lastUpdated timestamp."""
    last_updated = entry.get("lastUpdated")
    if not last_updated:
        return True

    try:
        if last_updated.endswith("Z"):
            last_updated = last_updated[:-1] + "+00:00"
        dt = datetime.fromisoformat(last_updated)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        age = (current_time - dt).total_seconds() / 60
        return age >= max_age_minutes
    except Exception:
        return True


def main():
    parser = argparse.ArgumentParser(description="Refresh Polymarket prediction market odds.")
    parser.add_argument("--id", help="Refresh one market by its JSON id.")
    parser.add_argument("--min-age", type=int, default=30, help="Minimum age in minutes before updating.")
    args = parser.parse_args()

    if not JSON_PATH.exists():
        print(f"JSON file not found: {JSON_PATH}")
        return 1

    with open(JSON_PATH, "r") as f:
        data = json.load(f)

    indices = data.get("indices", [])
    now = datetime.now(timezone.utc)
    updated = 0
    selected = 0
    skipped_recent = 0

    for entry in indices:
        entry_id = entry.get("id")
        if args.id and entry_id != args.id:
            continue

        # Only process Polymarket prediction markets
        if entry.get("category") != "Prediction Markets":
            continue
        if entry.get("agency") != "Polymarket":
            continue

        # Skip if recently updated (unless --id specified)
        if not args.id and not should_update_entry(entry, now, args.min_age):
            skipped_recent += 1
            continue

        selected += 1
        url = entry.get("url")
        if not url:
            print(f"[{entry_id}] no URL; skipping")
            continue

        slug = extract_slug_from_url(url)
        if not slug:
            print(f"[{entry_id}] could not extract slug from URL; skipping")
            continue

        try:
            events = fetch_event(slug)
        except (urllib.error.URLError, urllib.error.HTTPError) as e:
            print(f"[{entry_id}] API error for slug {slug} (after retries): {e}")
            continue
        except Exception as e:
            print(f"[{entry_id}] unexpected error: {e}")
            continue

        # Rate limiting
        time.sleep(random.uniform(0.2, 0.6))

        if not events:
            print(f"[{entry_id}] no event for slug {slug}")
            continue

        event = events[0]
        current_probs = get_current_probabilities(event)

        if not current_probs:
            print(f"[{entry_id}] no probabilities found in event data")
            continue

        # Get today's date key
        today = now.strftime("%Y-%m-%d")
        old_probs = entry.get("probabilities", {}).get(today, {})

        # Check if probabilities changed
        if current_probs == old_probs:
            print(f"[{entry_id}] no odds change; skipping")
            continue

        # Update probabilities
        if "probabilities" not in entry:
            entry["probabilities"] = {}
        entry["probabilities"][today] = current_probs

        # Update timestamp
        new_updated_at = event.get("updatedAt") or now.isoformat().replace("+00:00", "Z")
        entry["lastUpdated"] = new_updated_at

        # Update yes_odds/no_odds for binary markets
        if "yes" in current_probs and "no" in current_probs:
            entry["yes_odds"] = current_probs["yes"]
            entry["yes_probability"] = current_probs["yes"]
            entry["no_odds"] = current_probs["no"]
            entry["no_probability"] = current_probs["no"]

        print(f"[{entry_id}] updated probabilities: {current_probs}")
        updated += 1

    if selected == 0:
        if args.id:
            print(f"No entry found with id: {args.id}")
            return 1
        print("No Polymarket prediction markets matched filters (all recently updated).")
        return 0

    if updated == 0:
        print(f"No odds changes for {selected} selected market(s) (skipped_recent={skipped_recent}); skipping write")
        return 0

    # Write back to file
    with open(JSON_PATH, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Refreshed odds for {updated} of {selected} selected market(s) in {JSON_PATH} (skipped_recent={skipped_recent})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
