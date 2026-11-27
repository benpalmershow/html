# Fix: push/rebase race on `json/financials-data.json` and `json/fetch-status.json`

## Goal
Stop scheduled data workflows from failing when `main` advances between checkout and push. Two layers:
1. Serialize the only two workflows that commit the shared files so they never overlap.
2. Make `git_push_retry.sh` self-heal the residual "main advanced by an unrelated commit" race via a JSON deep-merge driver for `json/fetch-status.json`.

## Root cause (confirmed)
- Only two workflows commit the conflicting files, and they are in **different** concurrency groups:
  - `.github/workflows/fetch-all.yml` → group `financials-data`, `files: json/` (stages `financials-data.json` + `fetch-status.json`).
  - `.github/workflows/update-nfl-odds.yml:115` → group `update-nfl-odds`, `files: data/nfl-games.yml json/financials-data.json json/fetch-status.json`.
- They can run concurrently, both rebase onto an advanced `main`, and `scripts/git_push_retry.sh:10` aborts on any conflict → exit 1.
- `update-modern-web-guidance.yml` does a plain `git push` (touches only its own skill file) so it can advance `main` but does not conflict; it motivates the self-healing retry.
- `fetch-world-cup` / `fetch-earnings` / `fetch-13f` / `fetch-fec` call `update_fetch_status.py` but do **not** commit `fetch-status.json` (their `files:` lists only their own data file), so they are not push-conflict sources. Leave unchanged.

## Constraints honored
- No manual data edits; only CI/automation changes. Respects `data_changes_require_verified_process`.
- Reuses the shared `financials-data` group name (AGENTS.md: single serialized updater; do not add per-source financials workflows).
- No changes to `sw.js`, GA, or `vercel.json`.

## Tasks

### 1. Serialize the two writers (primary fix)
- Edit `.github/workflows/update-nfl-odds.yml` concurrency block (lines 28-30):
  - `group: financials-data`
  - `cancel-in-progress: false`
- `fetch-all.yml` already uses `financials-data` / `cancel-in-progress: false`; no change.
- Effect: NFL odds and the indicator fetcher queue behind each other; only the latest pending run is kept, the running one completes. No overlapping writers → no `financials-data.json` / `fetch-status.json` conflict from automation.

### 2. Add JSON deep-merge driver for `json/fetch-status.json` (safety net)
- New file `scripts/merge_fetch_status.py`:
  - CLI: `python3 scripts/merge_fetch_status.py <ancestor> <ours> <theirs>`; writes merged JSON to the `ours` (%A) path and exits 0.
  - Merge rules (direction-independent, correct under rebase where ours=origin/main, theirs=our replayed commit):
    - `workflows`: union of keys. For a key present in both, pick the entry with the later `lastRun` ISO timestamp (fallback: theirs). Non-conflicting keys pass through.
    - `generated`: the later (max) timestamp of ours/theirs.
    - `note`: ours if present else theirs.
    - Preserve all other top-level keys (ours-then-theirs union).
  - Use `fetch_utils.atomic_write_json` for the write; tolerate missing/corrupt inputs by falling back to the other side.
- New file `.gitattributes`:
  - `json/fetch-status.json merge=merge-fetch-status`

### 3. Harden `scripts/git_push_retry.sh`
- At top (after `branch=`), register the driver so any caller benefits:
  - `git config merge.merge-fetch-status.name "Deep-merge fetch-status.json"`
  - `git config merge.merge-fetch-status.driver "python3 scripts/merge_fetch_status.py %O %A %B"`
- Increase retries from `5` to `8`; keep `git fetch` + `git rebase origin/${branch}`.
- Keep abort-on-conflict for any remaining (non-`fetch-status`) conflict, but the message should note that `financials-data.json` conflicts indicate overlapping writers (should no longer occur after task 1).
- `commit-changes/action.yml` needs no change (it already calls the script); the driver config lives in the script.

### 4. (Optional, note only — not implemented)
- `fetch-world-cup` / `fetch-earnings` / `fetch-13f` / `fetch-fec` write `fetch-status.json` locally but never commit it, so their health entries are discarded. If desired later, add `json/fetch-status.json` to their `files:` (they would then also need the `financials-data` serialization). Out of scope for this fix.

## Validation
- `python3 -m py_compile scripts/merge_fetch_status.py`
- `bash -n scripts/git_push_retry.sh`
- `npm run validate` (JSON validity, references) — no data change expected.
- Manual driver test (temp branch, no push):
  1. `git checkout -b tmp-merge-test`
  2. Make two conflicting edits to `json/fetch-status.json` on `main` vs the branch (simulate by committing different `lastRun` values), configure the driver as in task 3, `git rebase main` (or `git merge`), confirm the file auto-merges with the newer `lastRun` per key and valid JSON.
  3. `git rebase --abort` / delete temp branch; `git checkout main`.
- Confirm `git config --get merge.merge-fetch-status.driver` resolves and `%O %A %B` paths are repo-relative (git runs drivers from repo root).

## Risks / open questions
- Custom merge drivers require `python3` on the runner — present in all data workflows (setup-python). Confirmed.
- If a future workflow starts committing `financials-data.json` outside the `financials-data` group, conflicts return to hard-fail (by design). Note in AGENTS.md is already present; no change needed.