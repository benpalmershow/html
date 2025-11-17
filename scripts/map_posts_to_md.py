#!/usr/bin/env python3
import argparse
import json
import shutil
import sys
import tempfile
from pathlib import Path
from datetime import datetime
from collections import defaultdict

def day_key(iso_dt: str) -> str:
    # Expect "YYYY-MM-DDTHH:MM:SS"
    return iso_dt.split("T", 1)[0]

def main():
    ap = argparse.ArgumentParser(description="Replace inline 'content' with 'file' refs to markdowns.")
    ap.add_argument("--posts-json", required=True, help="Path to posts.json")
    ap.add_argument("--md-dir", required=True, help="Directory with markdown posts (article/posts)")
    ap.add_argument("--apply", action="store_true", help="Write changes (default: dry-run)")
    args = ap.parse_args()

    posts_path = Path(args.posts_json).expanduser().resolve()
    md_dir = Path(args.md_dir).expanduser().resolve()

    if not posts_path.exists():
        print(f"ERROR: posts.json not found: {posts_path}", file=sys.stderr)
        sys.exit(1)
    if not md_dir.exists():
        print(f"ERROR: md directory not found: {md_dir}", file=sys.stderr)
        sys.exit(1)

    # Load posts.json
    with posts_path.open("r", encoding="utf-8") as f:
        try:
            posts = json.load(f)
        except Exception as e:
            print(f"ERROR: Failed to parse JSON: {e}", file=sys.stderr)
            sys.exit(1)
    if not isinstance(posts, list):
        print("ERROR: Expected top-level JSON array.", file=sys.stderr)
        sys.exit(1)

    # Collect already-referenced files to avoid double-assigning
    referenced_by_day = defaultdict(set)
    for p in posts:
        if isinstance(p, dict) and "file" in p and "date" in p:
            d = day_key(p["date"])
            referenced_by_day[d].add(p["file"])

    # Index markdown files by day
    md_by_day = defaultdict(list)
    for md in md_dir.glob("*.md"):
        # Expect filenames like 2025-11-04-foo.md or 2025-11-04.md
        name = md.name
        if len(name) >= 10 and name[:10].count("-") == 2:
            day = name[:10]
            rel_path = f"article/posts/{name}"  # posts.json expects this relative path
            md_by_day[day].append(rel_path)

    # Remove already-referenced files from candidates
    for day, used in referenced_by_day.items():
        if day in md_by_day:
            md_by_day[day] = [p for p in md_by_day[day] if p not in used]

    # Build mapping plan: for each day, match inline content posts to remaining md files
    content_posts_by_day = defaultdict(list)
    for idx, p in enumerate(posts):
        if isinstance(p, dict) and "date" in p and "content" in p and "file" not in p:
            content_posts_by_day[day_key(p["date"])].append(idx)

    # Sort markdown candidates deterministically by filename
    for day in md_by_day:
        md_by_day[day].sort()

    # Plan assignments and validate counts
    planned = {}  # post_index -> file_path
    errors = []
    print("Dry-run mapping plan (no changes will be written unless --apply):")
    for day, indices in sorted(content_posts_by_day.items()):
        candidates = md_by_day.get(day, [])
        print(f"- {day}: inline posts={len(indices)}, md candidates={len(candidates)}")
        if len(indices) != len(candidates):
            errors.append(f"Count mismatch for {day}: {len(indices)} inline vs {len(candidates)} md")
            # Show specifics to help fix quickly
            if len(indices) > 0:
                print(f"  Inline post indices (in JSON order): {indices}")
            if len(candidates) > 0:
                print(f"  MD files: {candidates}")
            continue

        # Assign in JSON order ↔ filename order
        for post_idx, md_path in zip(indices, candidates):
            planned[post_idx] = md_path
            print(f"  posts[{post_idx}] -> {md_path}")

    if errors:
        print("\nERRORS detected (no changes applied):")
        for e in errors:
            print(f"  - {e}")
        print("\nFix the mismatches (add missing md or adjust filenames) and re-run.")
        if args.apply:
            print("Refusing to write due to errors.")
        sys.exit(1)

    if not planned:
        print("Nothing to change. Exiting.")
        return

    # Apply changes
    updated = 0
    for idx, md_path in planned.items():
        p = posts[idx]
        # Remove large 'content' and set 'file'
        if "content" in p:
            del p["content"]
        p["file"] = md_path
        updated += 1

    print(f"\nPlanned updates: {updated} posts.")
    if not args.apply:
        print("Dry-run only. Re-run with --apply to write changes.")
        return

    # Backup original
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_path = posts_path.with_suffix(f".json.bak.{ts}")
    shutil.copy2(posts_path, backup_path)
    print(f"Backup written: {backup_path}")

    # Write atomically
    tmp_fd, tmp_path_str = tempfile.mkstemp(prefix="posts.json.", dir=str(posts_path.parent))
    tmp_path = Path(tmp_path_str)
    try:
        with open(tmp_fd, "w", encoding="utf-8") as f:
            json.dump(posts, f, ensure_ascii=False, indent=2)
            f.write("\n")
        tmp_path.replace(posts_path)
        print(f"Wrote: {posts_path}")
    except Exception as e:
        print(f"ERROR writing file: {e}", file=sys.stderr)
        print(f"Temp file retained at: {tmp_path}")
        sys.exit(1)

if __name__ == "__main__":
    main()
