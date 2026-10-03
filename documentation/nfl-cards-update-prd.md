# NFL Cards Update PRD

## Goal

When prompted with a request such as **"update NFL cards for week 5"**, update
the financials page with only verified upcoming NFL moneyline markets, without
creating cards whose source links or odds are missing.

## Source of truth and scope

- `json/nfl-games.yml` is the maintained NFL game source.
- `json/financials-data.json` is the rendered-site dataset, generated from the
  YAML by `scripts/apply-nfl-yml.py`.
- Polymarket's Gamma API is the automated odds source used by
  `scripts/fetch-nfl-odds.py`. Do not enter guessed, stale, or manually
  estimated odds.
- Process only the requested week for a manual weekly update. Do not rewrite
  unrelated indicators or other weeks.
- The displayed matchup is always away team `@` home team.

## Weekly workflow

1. Inspect the current worktree and existing NFL records before editing. Preserve
   unrelated user changes.
2. Verify the requested week's schedule, game dates/times, home/away assignment,
   team abbreviations, full names, and team market labels against a reliable
   schedule and live market listing.
3. Check the exact Polymarket event slug for each matchup. Add a game to the
   published set only when its event and full-game moneyline market are
   available. The market must have exactly the two expected team outcomes and
   usable prices. A schedule entry alone is not evidence that a market exists.
4. If a market or usable odds are unavailable, do not create placeholder odds
   or a card with a dead source link. Remove that matchup from
   `json/nfl-games.yml`. The week-scoped merge will remove any matching stale
   card from `json/financials-data.json`. Report which games were omitted and
   why.
5. Add/update the verified games in YAML, using stable IDs in the form
   `<away>-<home>-YYYY-MM-DD`, valid Polymarket slug/URL, correct `week`, both
   `<TEAM>_win_odds` fields, and `lastUpdated`.
6. Refresh only the requested week and merge only that week:

   ```sh
   python3 scripts/fetch-nfl-odds.py --week 5
   python3 scripts/apply-nfl-yml.py --week 5
   ```

   Replace `5` with the requested week number. Review fetch output; remove any
   game for which the event or moneyline was not found from YAML, then rerun
   the merge for that week. The merge skips records missing either team's odds
   and prunes stale cards from that week. Do not treat a successful process
   exit as proof every selected game's market was found.
7. Validate YAML as YAML and financials as JSON, then run the site validator:

   ```sh
   python3 -c 'import yaml; yaml.safe_load(open("json/nfl-games.yml", encoding="utf-8"))'
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
