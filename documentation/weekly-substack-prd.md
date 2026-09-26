# Weekly Update to Substack PRD

## Product
Howdy, Stranger Weekly Update

## Goal
Publish one concise weekly brief on Substack that summarizes the most important changes in jobs, markets, policy, and media context from the site.

## Primary User
Readers who want one high signal weekly recap and a printable reference.

## Problem
Daily updates are useful but fragmented. Weekly readers need one reliable cadence and a single narrative that surfaces the biggest directional changes, especially labor market movement.

## Success Criteria
1. Weekly issue published every week without misses.
2. Issue opens and reads exceed current baseline by 15% after 8 weeks.
3. At least one clear macro takeaway is stated in the first 120 words.
4. Every issue includes jobs story with absolute change and MoM context.

## Recommended Publish Day and Time
Saturday at 9:00 AM ET (6:00 AM PT).

## Why Saturday
1. Friday labor and market data are already in.
2. Weekend inbox competition is lower than weekday mornings.
3. Readers have time for long form scanning and print review.
4. Gives one full day buffer to adjust after Friday revisions.

## Core Weekly Sections
1. Headline Signal: 1 sentence with the week’s biggest move.
2. Labor First: total nonfarm employment level, absolute weekly highlight, MoM, and one implication.
3. Financial Dashboard: top 4 to 6 indicators with directional change.
4. Journal Pulse: 2 to 4 strongest commentary entries.
5. Media Additions: 1 to 3 recommended items with links.
6. What to Watch Next Week: 3 bullets with dates.

## Content Rules
1. First paragraph must include the core numeric story.
2. Use plain language and one chart maximum.
3. Every parenthetical must add utility: link, source, date, or method.
4. Any non-obvious title or reference must include a one-sentence synopsis in plain language.
5. No filler intro. Lead with the data move.

Example requirement:
`Knot Life (Media)` must include a descriptive line such as what the item is and why it is relevant.

## Workflow
1. Friday 4:00 PM PT: lock data snapshot from `json/financials-data.json`, `json/journal.json`, `json/media.json`, `json/posts.json`.
2. Friday 5:00 PM PT: generate and review `one-pager.html`.
3. Saturday 6:00 AM PT: draft and format Substack issue.
4. Saturday 6:30 AM PT: QA numbers, links, and headline.
5. Saturday 6:45 AM PT: send test email to internal list.
6. Saturday 7:00 AM PT: publish.

## QA Checklist
1. Jobs absolute change matches source arithmetic.
2. MoM values are rounded to one decimal and signs are correct.
3. All source links resolve.
4. Headline matches the biggest data move.
5. Ambiguous labels include a readable synopsis.
6. Print view remains one page.

## Dependencies
1. Accurate updates in site JSON files.
2. Stable one-pager rendering.
3. Substack publication access and test audience list.

## Risks and Mitigations
1. Late Friday revisions can alter headline.
Mitigation: final check Saturday before publish.
2. Too much content causes dilution.
Mitigation: hard cap section item counts.
3. Link rot or source changes.
Mitigation: validate all links during QA.
