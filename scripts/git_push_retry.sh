#!/usr/bin/env bash
set -euo pipefail
branch="${1:-$(git branch --show-current)}"
for i in 1 2 3 4 5; do
  if git push origin "HEAD:${branch}"; then
    exit 0
  fi
  echo "Push failed (attempt $i); rebasing onto origin/${branch}..." >&2
  git fetch origin "$branch"
  git rebase "origin/${branch}" || { echo "Rebase conflict; manual intervention required" >&2; git rebase --abort || true; exit 1; }
  sleep "$((i * 3))"
done
echo "Push failed after retries" >&2
exit 1
