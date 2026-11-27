#!/usr/bin/env python3
"""
Print the current NFL week number based on game dates in data/nfl-games.yml.

Selection logic:
  - Pick the nearest week among games whose game_time_iso is still in the
    future (the current/upcoming week being played).
  - If no upcoming games remain, fall back to the largest week present.

Prints the week number on stdout (empty string if no usable games).
Used by .github/workflows/update-nfl-odds.yml.
"""

import datetime
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print()
    sys.exit(0)


def main() -> int:
    doc = yaml.safe_load(Path("data/nfl-games.yml").read_text()) or {}
    now = datetime.datetime.now(datetime.timezone.utc)
    weeks = []
    for g in doc.get("games", []):
        w = g.get("week")
        iso = g.get("game_time_iso")
        if w is None or not iso:
            continue
        try:
            dt = datetime.datetime.fromisoformat(iso.replace("Z", "+00:00"))
        except ValueError:
            continue
        weeks.append((w, dt))
    if not weeks:
        print()
        return 0
    upcoming = [w for w, dt in weeks if dt >= now]
    if upcoming:
        print(min(upcoming))
    else:
        print(max(w for w, _ in weeks))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())