"""Shared helpers for fetch scripts."""
from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Any


def atomic_write_json(path: str | os.PathLike[str], data: Any) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write("\n")
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
    finally:
        try:
            os.unlink(tmp)
        except FileNotFoundError:
            pass


def atomic_write_text(path: str | os.PathLike[str], text: str) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as f:
            f.write(text)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
    finally:
        try:
            os.unlink(tmp)
        except FileNotFoundError:
            pass


def strip_keys(obj: Any, keys: set[str]) -> Any:
    if isinstance(obj, dict):
        return {k: strip_keys(v, keys) for k, v in obj.items() if k not in keys}
    if isinstance(obj, list):
        return [strip_keys(v, keys) for v in obj]
    return obj


def merge_by_key(new_items: list[dict], old_items: list[dict], key: str) -> list[dict]:
    """Merge freshly fetched records over historical ones by ``key``.

    Newer values win for matching keys (outdated data is replaced), while old
    records whose key is absent from ``new_items`` are preserved so important
    history is not dropped when the fetcher only returns a rolling window.
    The result is sorted by key descending (newest first).
    """
    merged: dict[str, dict] = {}
    for item in old_items or []:
        k = item.get(key)
        if k:
            merged[k] = item
    for item in new_items or []:
        k = item.get(key)
        if k:
            merged[k] = item
    return sorted(merged.values(), key=lambda i: i.get(key, ""), reverse=True)
