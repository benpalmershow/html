# NFL Cards Update PRD

## Goal

Update the financials page with only verified upcoming NFL moneyline markets,
without creating cards whose source links or odds are missing.

## Source of truth and scope

- `data/nfl-games.yml` is the maintained NFL game source.
- `json/financials-data.json` is the rendered-site dataset, generated from the
  YAML by `scripts/apply-nfl-yml.py`.
- Polymarket's Gamma API is the automated odds source used by
  `scripts/fetch-nfl-odds.py`. Do not enter guessed, stale, or manually
  estimated odds.
- The displayed matchup is always away team `@` home team.

## CLI tools

**`scripts/fetch-nfl-odds.py`** — refreshes win odds from Polymarket and rewrites
`data/nfl-games.yml` in place.

```
python3 scripts/fetch-nfl-odds.py [--week 5] [--game-id ne-sea-2026-09-09]
                                  [--mode full|live] [--pre-minutes 15]
                                  [--post-hours 4] [--max-age-min 3]
                                  [--no-skip-recent]
```

- `--week` limits API calls and merges to the requested NFL week.
- `--game-id` refreshes a single game by its YAML id.
- `--mode live` only polls games inside their live window (used by the live
  workflow). `--mode full` polls all selected games (default).
- For each game with a `polymarket_slug`, queries
  `https://gamma-api.polymarket.com/events?slug=<slug>` and rewrites the
  `<TEAM>_win_odds` fields from the full-game moneyline market's
  `outcomePrices` (e.g. `"0.385"` -> `"38.5¢"`). `lastUpdated` is set to the
  event's `updatedAt`.
- Odds are appended to `odds_history` only when the snapshot differs from the
  last entry, so repeat refreshes with the same timestamp/prices do not create
  duplicate samples.
- All other YAML content is preserved. Games without a usable moneyline market
  are left unchanged (not removed by the fetcher).

**`scripts/apply-nfl-yml.py`** — merges `data/nfl-games.yml` into
`json/financials-data.json`.

```
python3 scripts/apply-nfl-yml.py [--week 5] [--replace-completed]
```

- Each game becomes a "Prediction Markets" indicator (`name = "AWAY @ HOME"`),
  upserted by `id`. No other indicators are touched.
- With `--replace-completed`, games whose `game_time_iso` is in the past are
  removed from the rendered dataset.
- Games missing both team odds are skipped and not rendered.
- YAML odds (`"38.5¢"`) are converted to integer strings (`"38"`) with no
  cents symbol or decimal places in `financials-data.json`.

**`scripts/validate-nfl-odds.py`** — validates that every game has a live
Polymarket moneyline market with both outcomes and usable prices. Exits
non-zero on any failure.

```
python3 scripts/validate-nfl-odds.py [--week 5]
```

## Required YAML fields per game

- `id` — stable, form `<away>-<home>-YYYY-MM-DD`, unique across the file.
- `week` — NFL week number (integer).
- `away` / `home` — team abbreviations.
- `away_full` / `home_full` — full team names (used for `game_title`).
- `away_pm_name` / `home_pm_name` — Polymarket outcome labels (must match the
  moneyline market outcomes exactly).
- `game_time` / `game_time_iso` — human-readable and ISO-8601 UTC game time.
- `url` — Polymarket sports page URL (functional source link).
- `polymarket_slug` — exact Polymarket event slug used by the Gamma API.
- `polymarket_url` — optional direct Polymarket event URL.
- `<TEAM>_win_odds` — both team win odds, `¢`-suffixed strings (e.g. `38.5¢`).
- `lastUpdated` — ISO-8601 UTC timestamp.
- Optional: `away_color`, `home_color`, `explanation`, `odds_history`, `winner`,
  `result`.

## Workflows

Two GitHub Actions workflows drive the pipeline:

### 1. Daily week-scoped refresh — `.github/workflows/update-nfl-odds.yml`

Runs daily at 06:00 UTC (plus manual `workflow_dispatch`). Derives the active
NFL week from `data/nfl-games.yml` (not the ISO calendar week), then:

1. `python3 scripts/fetch-nfl-odds.py --week <week>`
2. `python3 scripts/validate-nfl-odds.py` (if present; fails the job on issues)
3. `python3 -m json.tool json/financials-data.json > /dev/null`
4. `python3 -c "import yaml; yaml.safe_load(open('data/nfl-games.yml'))"`
5. `node scripts/validate-site.js`
6. `python3 scripts/apply-nfl-yml.py --week <week> --replace-completed`
7. Commit `data/nfl-games.yml` and `json/financials-data.json` if changed.

### 2. Live gametime refresh — `.github/workflows/update-nfl-odds-live.yml`

Runs every 5 minutes during Thursday/Sunday/Monday gametime windows (plus
manual `workflow_dispatch`):

1. `python3 scripts/fetch-nfl-odds.py --mode live`
2. Validate YAML/JSON and run `node scripts/validate-site.js`
3. `python3 scripts/apply-nfl-yml.py` (all weeks, no `--replace-completed`)
4. Commit if changed.

## Weekly manual workflow

1. Inspect the current worktree and existing NFL records before editing.
   Preserve unrelated user changes.
2. Verify the requested week's schedule, game dates/times, home/away
   assignment, team abbreviations, full names, and team market labels against a
   reliable schedule and live market listing.
3. Check the exact Polymarket event slug for each matchup. The market must have
   exactly the two expected team outcomes and usable prices. A schedule entry
   alone is not evidence that a market exists.
4. If a market or usable odds are unavailable, do not create placeholder odds
   or a card with a dead source link. Remove that matchup from
   `data/nfl-games.yml`. The week-scoped merge will remove any matching stale
   card from `json/financials-data.json`. Report which games were omitted and
   why.
5. Add/update the verified games in YAML, using stable IDs in the form
   `<away>-<home>-YYYY-MM-DD`, valid Polymarket slug/URL, correct `week`, both
   `<TEAM>_win_odds` fields, and `lastUpdated`.
6. Refresh only the requested week and merge only that week:

   ```sh
   python3 scripts/fetch-nfl-odds.py --week 5
   python3 scripts/validate-nfl-odds.py --week 5
   python3 scripts/apply-nfl-yml.py --week 5 --replace-completed
   ```

7. Validate YAML as YAML and financials as JSON, then run the site validator:

   ```sh
   python3 -c 'import yaml; yaml.safe_load(open("data/nfl-games.yml", encoding="utf-8"))'
   python3 -m json.tool json/financials-data.json > /dev/null
   npm run validate
   ```

8. Confirm each published week entry has a unique ID, a functional market URL,
   both live odds fields, and a corresponding indicator in `financials-data`.
   Confirm no removed/unavailable ID remains in either dataset.

## Reliability requirements

- A missing Polymarket event or moneyline means the game is omitted from the
  published cards; never infer odds from the schedule, market favorites, or
  final scores.
- The `week` filter limits API calls and merges to the requested week.
- Re-running an odds refresh with the same timestamp and prices must not append
  a duplicate odds-history sample.
- `--replace-completed` remains available to the scheduled workflow for
  removing completed games from the rendered dataset.
- The YAML workflow must parse YAML with a YAML parser. Never validate YAML
  using `json.tool`, and never suppress a parser failure.

## Acceptance criteria

- Only the requested week's verified, linkable games are added or refreshed.
- Each displayed NFL card has both team odds, an accurate away/home matchup,
  and a live source URL.
- Unavailable markets are removed from the YAML source and are not rendered in
  financials output.
- No duplicate odds-history entries are introduced by repeat refreshes.
- YAML parsing, JSON parsing, and `npm run validate` all pass.
- Existing unrelated financial indicators and user worktree changes are
  preserved.
