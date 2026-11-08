#!/usr/bin/env python3
"""Targeted validation for NFL odds data files (fast, for live workflow)."""
import json
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("PyYAML required")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
errors = []

fp = ROOT / "json" / "financials-data.json"
try:
    data = json.loads(fp.read_text(encoding="utf-8"))
    if not isinstance(data.get("indices"), list):
        errors.append("financials-data.json: indices must be a list")
    ids = set()
    for i, ind in enumerate(data.get("indices", [])):
        if not isinstance(ind, dict):
            errors.append(f"indices[{i}] not an object")
            continue
        iid = ind.get("id")
        if iid:
            if iid in ids:
                errors.append(f"duplicate indicator id: {iid}")
            ids.add(iid)
        if ind.get("category") == "Prediction Markets" and ind.get("agency") == "Polymarket" and ind.get("game_time_iso"):
            for k, v in ind.items():
                if k.endswith("_win_odds") and isinstance(v, str) and ("¢" in v or "." in v):
                    errors.append(f"{iid or ind.get('name')}: {k} must be integer string, got {v!r}")
except Exception as e:
    errors.append(f"financials-data.json: {e}")

yp = ROOT / "data" / "nfl-games.yml"
try:
    doc = yaml.safe_load(yp.read_text(encoding="utf-8")) or {}
    games = doc.get("games")
    if not isinstance(games, list):
        errors.append("nfl-games.yml: games must be a list")
    else:
        seen = set()
        for g in games:
            gid = g.get("id")
            if not gid:
                errors.append("nfl game missing id")
            elif gid in seen:
                errors.append(f"duplicate nfl game id: {gid}")
            else:
                seen.add(gid)
            for req in ("away", "home", "game_time_iso", "polymarket_slug"):
                if not g.get(req):
                    errors.append(f"{gid}: missing {req}")
except Exception as e:
    errors.append(f"nfl-games.yml: {e}")

if errors:
    print(f"NFL data validation failed ({len(errors)}):")
    for e in errors:
        print(f" - {e}")
    sys.exit(1)
print("NFL data validation passed.")
