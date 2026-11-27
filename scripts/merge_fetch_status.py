#!/usr/bin/env python3
"""
Git merge driver for json/fetch-status.json.

Registered via .gitattributes (`merge=merge-fetch-status`) and configured in
scripts/git_push_retry.sh as:

    git config merge.merge-fetch-status.driver \
        "python3 scripts/merge_fetch_status.py %O %A %B"

Git invokes the driver as:  merge_fetch_status.py <ancestor> <ours> <theirs>
and expects the merged result written to the <ours> (%A) path with exit 0.

Why a custom driver: json/fetch-status.json is a registry of per-workflow
health entries. Concurrent runs each rewrite the whole file, so a plain rebase
conflicts on it even though the changes are logically independent (each workflow
owns its own key under "workflows"). This driver performs a JSON-aware 3-way
merge that is safe in either direction (rebase or merge):

  - "workflows": union of keys. When a key exists on both sides, keep the entry
    with the later "lastRun" timestamp (ties -> theirs).
  - "generated": the later (max) timestamp of ours/theirs.
  - "note": ours if present, otherwise theirs.
  - any other top-level key: ours-then-theirs union (ours wins on conflict).

The merge never fails: missing or corrupt inputs fall back to whichever side
parses, and if neither parses the <ours> file is left untouched.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

try:
    from fetch_utils import atomic_write_json
except ImportError:
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from fetch_utils import atomic_write_json  # type: ignore


def _load(path: str):
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else None
    except (OSError, json.JSONDecodeError):
        return None


def _last_run(entry):
    if isinstance(entry, dict):
        val = entry.get("lastRun")
        if isinstance(val, str):
            return val
    return ""


def _merge_workflows(ours, theirs):
    merged = {}
    # Start from ours, then overlay theirs for keys ours lacks.
    merged.update(ours)
    for key, t_entry in theirs.items():
        if key not in merged:
            merged[key] = t_entry
            continue
        o_entry = merged[key]
        # Both sides touched this workflow: keep the fresher lastRun.
        if _last_run(t_entry) >= _last_run(o_entry):
            merged[key] = t_entry
    return merged


def merge(ancestor, ours, theirs):
    if ours is None and theirs is None:
        return ancestor if ancestor is not None else {}
    if ours is None:
        return theirs
    if theirs is None:
        return ours

    result = dict(ours)
    for key, t_val in theirs.items():
        if key not in result:
            result[key] = t_val

    if isinstance(result.get("workflows"), dict) or isinstance(theirs.get("workflows"), dict):
        o_wf = ours.get("workflows") if isinstance(ours.get("workflows"), dict) else {}
        t_wf = theirs.get("workflows") if isinstance(theirs.get("workflows"), dict) else {}
        result["workflows"] = _merge_workflows(o_wf, t_wf)

    # generated: later timestamp wins.
    gen = max(
        (v for v in (ours.get("generated"), theirs.get("generated")) if isinstance(v, str)),
        default=None,
    )
    if gen is not None:
        result["generated"] = gen

    # note: ours if present else theirs.
    if "note" not in result or result.get("note") in (None, ""):
        if isinstance(theirs.get("note"), str):
            result["note"] = theirs["note"]

    return result


def main(argv):
    if len(argv) != 4:
        print("usage: merge_fetch_status.py <ancestor> <ours> <theirs>", file=sys.stderr)
        return 2
    ancestor_path, ours_path, theirs_path = argv[1], argv[2], argv[3]
    ancestor = _load(ancestor_path)
    ours = _load(ours_path)
    theirs = _load(theirs_path)

    merged = merge(ancestor, ours, theirs)
    atomic_write_json(ours_path, merged)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))