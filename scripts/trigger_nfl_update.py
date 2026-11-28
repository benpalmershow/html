#!/usr/bin/env python3
"""Detect finished NFL games and trigger the update-nfl-odds workflow via repository_dispatch."""
import os, sys, json, urllib.request, urllib.error
from datetime import datetime, timedelta, timezone
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parent.parent
YAML_PATH = ROOT / "data" / "nfl-games.yml"
TOKEN = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
REPO = os.environ.get("GITHUB_REPOSITORY", "benpalmershow/html")

def main():
    if not TOKEN:
        print("GH_TOKEN/GITHUB_TOKEN required"); return 1
    doc = yaml.safe_load(YAML_PATH.read_text()) or {}
    now = datetime.now(timezone.utc)
    triggered = 0
    for g in doc.get("games", []):
        gt = g.get("game_time_iso")
        if not gt:
            continue
        try:
            dt = datetime.fromisoformat(gt.replace("Z", "+00:00"))
        except Exception:
            continue
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        # game considered finished 3.5h after kickoff
        if now < dt + timedelta(hours=3, minutes=30):
            continue
        # skip already settled
        away = g.get(f"{g['away']}_win_odds")
        home = g.get(f"{g['home']}_win_odds")
        if away in ("0", "0.0", 0, 0.0) or home in ("0", "0.0", 0, 0.0):
            # could be settled; still trigger to be safe only if not final
            pass
        payload = json.dumps({"event_type": "nfl-game-complete", "client_payload": {"game_id": g["id"]}}).encode()
        req = urllib.request.Request(
            f"https://api.github.com/repos/{REPO}/dispatches",
            data=payload,
            headers={"Authorization": f"Bearer {TOKEN}", "Accept": "application/vnd.github+json", "Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req) as r:
                print(f"triggered {g['id']}: {r.status}")
                triggered += 1
        except urllib.error.HTTPError as e:
            print(f"failed {g['id']}: {e.code} {e.read().decode()[:200]}")
    print(f"triggered {triggered} games")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
