#!/usr/bin/env bash
set -euo pipefail
branch="${1:-$(git branch --show-current)}"

# Register the JSON-aware merge driver for json/fetch-status.json so a rebase
# onto an advanced main auto-merges the per-workflow health registry instead of
# aborting on a conflict. Configured here (not only in the composite action) so
# every caller of this script gets the behavior.
git config merge.merge-fetch-status.name "Deep-merge fetch-status.json"
git config merge.merge-fetch-status.driver "python3 scripts/merge_fetch_status.py %O %A %B"

for i in 1 2 3 4 5 6 7 8; do
  if git push origin "HEAD:${branch}"; then
    exit 0
  fi
  echo "Push failed (attempt $i); rebasing onto origin/${branch}..." >&2
  git fetch origin "$branch"
  if ! git rebase "origin/${branch}"; then
    echo "Rebase conflict; aborting. json/fetch-status.json is auto-merged, so a remaining conflict (e.g. json/financials-data.json) means two financials-data writers overlapped - check the 'financials-data' concurrency group." >&2
    git rebase --abort || true
    exit 1
  fi
  sleep "$((i * 3))"
done
echo "Push failed after retries" >&2
exit 1