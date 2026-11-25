#!/usr/bin/env python3
"""
Update the fetch-health registry in json/fetch-status.json.

Each scheduled fetch workflow records its last run here so the site can
expose whether fetches are timely and whether any source is stale/broken.

Usage:
    python3 scripts/update_fetch_status.py \
        --workflow fetch-fred-monthly \
        --status ok \
        --changes 3 \
        --notes "FRED monthly indicators refreshed"
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    from fetch_utils import atomic_write_json
except ImportError:
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from fetch_utils import atomic_write_json  # type: ignore

ROOT = Path(__file__).resolve().parent.parent
STATUS_PATH = ROOT / "json" / "fetch-status.json"


def load_status():
    if STATUS_PATH.exists():
        try:
            with open(STATUS_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            pass
    return {"generated": None, "workflows": {}}


def main() -> None:
    parser = argparse.ArgumentParser(description="Record a fetch workflow's health status.")
    parser.add_argument("--workflow", required=True, help="Workflow name (e.g. fetch-fred-monthly)")
    parser.add_argument("--status", required=True, choices=["ok", "failed", "skipped"], help="Run outcome")
    parser.add_argument("--changes", type=int, default=0, help="Number of values changed")
    parser.add_argument("--notes", default="", help="Free-form notes about the run")
    args = parser.parse_args()

    status = load_status()
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    entry = {
        "lastRun": now,
        "status": args.status,
        "changes": args.changes,
        "notes": args.notes,
    }
    status.setdefault("workflows", {})[args.workflow] = entry
    status["generated"] = now

    atomic_write_json(STATUS_PATH, status)
    print(f"Recorded {args.workflow}: status={args.status} changes={args.changes} at {now}")


if __name__ == "__main__":
    main()
