#!/usr/bin/env python3
"""
Fetch-health watchdog.

Reads json/fetch-status.json (written by the fetch workflows via
scripts/update_fetch_status.py) and fails when a source has not run within its
expected cadence. This turns a silently-broken scheduler or source into a loud
red workflow instead of a quietly stale dataset.

Usage:
  python3 scripts/check_fetch_health.py              # exit 1 if anything is stale
  python3 scripts/check_fetch_health.py --warn-only   # report but always exit 0
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STATUS_PATH = ROOT / "json" / "fetch-status.json"

# workflow -> max age (hours) before it is considered stale.
EXPECTED = {
    "fetch-fred-daily": 26,
    "fetch-fred-weekly": 200,
    "fetch-fred-monthly": 960,
    "fetch-adp": 960,
    "fetch-bls": 960,
    "fetch-census": 960,
    "fetch-treasury": 26,
    "fetch-usda": 500,
    "fetch-other-indicators": 26,
    "fetch-manheim": 960,
    "fetch-housing-sentiment": 960,
    "fetch-earnings": 240,
    "fetch-13f": 2400,
    "fetch-fec": 300,
    "update-nfl-odds": 72,
    "fetch-world-cup": 6,
}

# Seasonal workflows are only checked inside their active months.
SEASONAL = {
    "update-nfl-odds": lambda m: 9 <= m <= 12 or m <= 2,
    "fetch-world-cup": lambda m: 6 <= m <= 7,
}


def parse_iso(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--warn-only", action="store_true")
    args = parser.parse_args()

    if not STATUS_PATH.exists():
        print(f"ERROR: {STATUS_PATH} missing; no fetch has recorded status yet.")
        sys.exit(1)

    status = json.loads(STATUS_PATH.read_text())
    workflows = status.get("workflows", {})
    now = datetime.now(timezone.utc)
    month = now.month

    stale = []
    for name, max_hours in EXPECTED.items():
        if name in SEASONAL and not SEASONAL[name](month):
            continue
        entry = workflows.get(name)
        if not entry:
            stale.append(f"{name}: never recorded")
            continue
        last = parse_iso(entry.get("lastRun"))
        if last is None:
            stale.append(f"{name}: invalid lastRun")
            continue
        age_h = (now - last).total_seconds() / 3600.0
        if age_h > max_hours:
            stale.append(f"{name}: last run {age_h:.1f}h ago (> {max_hours}h)")
        if entry.get("status") == "failed":
            stale.append(f"{name}: last run status=failed")

    if stale:
        print("Fetch health: STALE")
        for s in stale:
            print(f"  - {s}")
        if not args.warn_only:
            sys.exit(1)
    else:
        print("Fetch health: OK (all expected sources fresh).")


if __name__ == "__main__":
    main()