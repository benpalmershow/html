#!/usr/bin/env python3
"""
Fetch-coverage check + stale "New" badge cleanup.

Two jobs:

1. Coverage: cross-reference the SOURCE_REGISTRY in fetch_other_indicators.py
   against json/financials-data.json. Every source marked ``implemented: True``
   must map to a real indicator (id + agency); entries whose note says they are
   "Now covered by" another script are reported as moved (informational). This
   catches registry drift where a source is silently no longer wired up.

2. Badge hygiene: the "New" badge is driven by ``newMonth`` + a render-time
   recency window (see js/indicators.js). If a fetcher stops running, a stale
   ``newMonth: true`` would otherwise linger in the JSON forever. This clears
   ``newMonth`` once ``lastUpdated`` is older than the window so the stored
   data stays accurate (the renderer already hides it, this keeps JSON clean).

Writes json/financials-data.json only when a stale badge is cleared.

Usage:
  python3 scripts/check_fetch_coverage.py
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from fetch_utils import atomic_write_json

ROOT = Path(__file__).resolve().parent.parent
FINANCIALS_PATH = ROOT / "json" / "financials-data.json"
sys.path.insert(0, str(Path(__file__).resolve().parent))

# Keep in sync with NEW_BADGE_WINDOW_MS in js/indicators.js (7 days here so the
# stored flag is cleared slightly after the renderer stops showing it).
NEW_BADGE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000


def parse_iso(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None


def load_registry():
    try:
        from fetch_other_indicators import SOURCE_REGISTRY
        return SOURCE_REGISTRY
    except Exception as e:  # pragma: no cover
        print(f"WARN: could not load SOURCE_REGISTRY: {e}")
        return {}


def check_coverage(data):
    registry = load_registry()
    indices = data.get("indices", [])
    by_id_agency = {(i.get("id"), i.get("agency")) for i in indices}

    problems = 0
    moved = 0
    for indicator_id, cfg in registry.items():
        note = cfg.get("note", "")
        if note.startswith("Now covered by"):
            moved += 1
            continue
        if not cfg.get("implemented"):
            continue
        if (indicator_id, cfg.get("agency")) not in by_id_agency:
            print(f"ERROR: implemented source '{indicator_id}' ({cfg.get('agency')}) not found in JSON")
            problems += 1

    print(f"Coverage: {len(registry)} registry entries, {moved} moved to dedicated scripts, {problems} problem(s)")
    return problems


def clear_stale_new_badges(data):
    now = datetime.now(timezone.utc)
    cleared = []
    for indicator in data.get("indices", []):
        if indicator.get("newMonth") is not True:
            continue
        last = parse_iso(indicator.get("lastUpdated"))
        if last is None:
            continue
        age_ms = (now - last).total_seconds() * 1000
        if age_ms >= NEW_BADGE_WINDOW_MS:
            indicator["newMonth"] = False
            cleared.append(indicator.get("name") or indicator.get("id"))
    return cleared


def main():
    data = json.loads(FINANCIALS_PATH.read_text())
    problems = check_coverage(data)

    cleared = clear_stale_new_badges(data)
    if cleared:
        atomic_write_json(FINANCIALS_PATH, data)
        print(f"Cleared {len(cleared)} stale New badge(s): {', '.join(cleared)}")
    else:
        print("No stale New badges to clear.")

    if problems:
        sys.exit(1)


if __name__ == "__main__":
    main()