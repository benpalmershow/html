# Product Requirements Document: Financial Data Management

## Overview
Standard operating procedure for maintaining and updating the financial indicators and prediction markets data in `json/financials-data.json`, with focus on updating NFL game predictions and replacing completed games. Includes SOP for managing financials.html display items.

---

## Trigger Phrases
When user prompts related to financial data updates:
- **"update financials with new NFL game"**
- **"replace completed NFL prediction"**
- **"add new prediction market"**
- **"update economic indicator [NAME]"**
- **"refresh financial data"**
- **"update NFL games"**
- **"add Super Bowl prediction"**
- **"update Super Bowl odds"**

---

## Prediction Markets Update Protocol

### NFL Game Prediction Updates

Use the dedicated [NFL Cards Update PRD](./nfl-cards-update-prd.md) for the
Polymarket-backed schedule, market verification, week-scoped refresh, cleanup,
and validation procedure. The automated implementation lives in
`scripts/fetch-nfl-odds.py`, `scripts/apply-nfl-yml.py`, and
`.github/workflows/update-nfl-markets.yml`.

---

### FOMC Rate Decision Prediction Updates

#### Step 0: Identify Next FOMC Meeting Date
**Process:**
1. Visit Federal Reserve calendar: https://www.federalreserve.gov/monetarypolicy/fomccalendar.htm
2. Identify next scheduled FOMC meeting date (typically every 6-8 weeks)
3. Confirm meeting date is within 2-8 weeks for active prediction markets
4. Note the decision announcement date (usually 2:00 PM ET on final day of meeting)

#### Step 1: Research FOMC Decision Markets
**Data Sources (in priority order):**
1. **Kalshi** - FOMC rate decision markets with probability of rate cuts/hikes
   - Markets typically available 6-8 weeks before meeting
   - Format: `kxfomc-[DATE][DECISION]` (e.g., `kxfomc-25jan29cut`)
2. **Polymarket** - FOMC prediction markets with alternative outcome probabilities
   - Cross-reference probabilities with Kalshi
   - More reliably available than specialized sites
3. **Federal Reserve websites** - Official meeting schedules and historical decisions

**Rate Decision Options:**
- Rate Cut (e.g., 0.25% cut)
- Rate Hold (no change)
- Rate Hike (e.g., 0.25% increase)
- Markets may split outcomes by basis point increments

#### Step 2: Verify FOMC Decision Probabilities
**CRITICAL: Always verify actual odds from live market data before updating JSON**

**Kalshi FOMC Verification:**
1. Visit the Kalshi FOMC market URL
2. Check probability percentages for each outcome (Cut/Hold/Hike)
3. Record exact probabilities as they appear (e.g., "68¢" for 68% probability)
4. Verify probabilities roughly sum to 100¢

**Polymarket FOMC Verification:**
1. Visit the Polymarket FOMC event page
2. Cross-reference outcome probabilities
3. Use as backup if Kalshi data unavailable
4. Document any significant probability divergences (>5¢)

**Odds Update Timing:**
- Update probabilities 2-4 weeks before FOMC meeting
- Re-check within 7 days of meeting for significant changes
- Lock odds 24 hours before announcement

#### Step 3: Update JSON Structure
**FOMC Prediction Market Template:**
```json
{
    "category": "Prediction Markets",
    "agency": "Kalshi",
    "name": "FOMC Rate Decision - [DATE]",
    "meeting_date": "[Month Day, Year]",
    "announcement_time": "2:00 PM ET",
    "announcement_time_iso": "[YYYY-MM-DDTHH:MM:SS-04:00]",
    "url": "[KALSHI_FOMC_URL]",
    "polymarket_url": "[POLYMARKET_FOMC_URL]",
    "rate_cut_odds": "[ODDS]¢",
    "rate_hold_odds": "[ODDS]¢",
    "rate_hike_odds": "[ODDS]¢",
    "explanation": "Federal Reserve interest rate decision prediction market. Odds reflect market probability of the FOMC cutting, holding, or raising the federal funds rate at the [DATE] meeting. Market expectations incorporate inflation data, employment reports, and Fed forward guidance."
}
```

**Field Requirements:**
- `name`: Format "FOMC Rate Decision - [MONTH YEAR]" (e.g., "FOMC Rate Decision - January 2026")
- `meeting_date`: Human-readable format (e.g., "Jan 28-29, 2026")
- `announcement_time`: Standard 2:00 PM ET for FOMC announcements
- `announcement_time_iso`: ISO 8601 format with correct date/time
- `url`: Kalshi FOMC market URL
- `polymarket_url`: Direct Polymarket FOMC event link
- `rate_cut_odds`, `rate_hold_odds`, `rate_hike_odds`: Probabilities in cents format (e.g., "65¢")
- `explanation`: Standard template with specific meeting date and rate context

#### Step 4: Replace Expired FOMC Markets
**Process:**
1. Identify FOMC meetings that have already occurred (announcement_time_iso < current date)
2. Remove completed FOMC decision markets
3. Add new upcoming FOMC market with verified odds
4. Update `lastUpdated` timestamp

#### Step 5: Quality Verification
**Before committing:**
- [ ] Kalshi and Polymarket URLs functional
- [ ] Probabilities verified from live market sources
- [ ] Probabilities current (within 24 hours for imminent meetings)
- [ ] Meeting date is in future
- [ ] FOMC announcement time correct (2:00 PM ET)
- [ ] Date format consistent with other markets
- [ ] Outcome probabilities roughly sum to 100¢
- [ ] JSON syntax valid
- [ ] No duplicate FOMC entries
- [ ] Explanation mentions correct meeting date

---

### Super Bowl Prediction Updates

#### Step 0: Identify Super Bowl Date and Teams
**Process:**
1. Determine Super Bowl date (typically first or second Sunday in February)
2. If playoff schedule not finalized, confirm with NFL.com or ESPN
3. Super Bowl prediction markets typically activate 2-4 weeks before game
4. Note conference championship dates to ensure playoff teams are determined

#### Step 1: Research Super Bowl Markets
**Data Sources (in priority order):**
1. **Kalshi** - Super Bowl winner/team outcome markets
   - Markets available 2-4 weeks before Super Bowl
   - Multiple market types: Winner, Conference winner, spread coverage
   - Format: `kxsuperbowl-[YEAR][MARKET]` (e.g., `kxsuperbowl-26winner`)
2. **Polymarket** - Super Bowl prediction markets with alternative probabilities
   - Cross-reference probabilities with Kalshi
   - Sometimes more liquid for specific outcomes
3. **ESPN Sports Book** - Consensus NFL odds for validation
   - Use for verification only, not primary source

**Market Types Available:**
- **Super Bowl Winner**: Which team wins outright
- **Conference Winner**: Which conference's team wins (AFC vs NFC)
- **Spread Markets**: Point spread probability for favored vs underdog team
- **Parlay Markets**: Combined outcome probabilities

#### Step 2: Verify Team and Odds Data
**CRITICAL: Always verify actual odds from live market data before updating JSON**

**For Super Bowl Teams:**
1. Confirm teams from NFL playoff results (not speculation on likely teams)
2. Only add Super Bowl market AFTER playoff bracket is finalized
3. Use official team names: Full name + city (e.g., "Kansas City Chiefs" not just "Chiefs")
4. Verify team abbreviations match standard NFL codes

**Kalshi Super Bowl Odds Verification:**
1. Visit the Kalshi Super Bowl market URL
2. Check probability for each team outcome
3. Record exact probabilities as they appear (e.g., "38¢" for 38% probability)
4. If multiple market types, capture primary "Winner" market
5. Verify all team probabilities sum to approximately 100¢

**Polymarket Super Bowl Verification:**
1. Visit Polymarket Super Bowl event page
2. Cross-reference team outcome probabilities
3. Check if odds differ by more than 5¢ from Kalshi
4. Document any significant divergences
5. Use Polymarket as backup if Kalshi unavailable

**Odds Update Timing:**
- Update probabilities 3-4 weeks before Super Bowl (once teams confirmed)
- Re-check odds weekly for major changes
- Lock odds 24 hours before kickoff
- Update if odds shift by more than 5¢ for any team

#### Step 3: Update JSON Structure
**Super Bowl Prediction Market Template:**
```json
{
    "category": "Prediction Markets",
    "agency": "Kalshi",
    "name": "Super Bowl LIX Winner",
    "event": "Super Bowl LIX",
    "game_date": "[Month Day, Year]",
    "game_time": "[Time ET]",
    "game_time_iso": "[YYYY-MM-DDTHH:MM:SS-04:00]",
    "url": "[KALSHI_SUPERBOWL_URL]",
    "polymarket_url": "[POLYMARKET_SUPERBOWL_URL]",
    "[TEAM1_ABBREV]_win_odds": "[ODDS]¢",
    "[TEAM2_ABBREV]_win_odds": "[ODDS]¢",
    "[TEAM3_ABBREV]_win_odds": "[ODDS]¢",
    "[TEAM4_ABBREV]_win_odds": "[ODDS]¢",
    "explanation": "Super Bowl LIX winner prediction market. Odds reflect the market probability of each team winning the championship. Market expectations incorporate team strength, key injuries, playoff seeding, and historical performance."
}
```

**Field Requirements:**
- `name`: "Super Bowl [ROMAN_NUMERAL] Winner" (e.g., "Super Bowl LIX Winner")
- `event`: "Super Bowl [ROMAN_NUMERAL]"
- `game_date`: Date of Super Bowl (e.g., "Feb 9, 2026")
- `game_time`: Kickoff time (typically 6:30 PM ET)
- `game_time_iso`: ISO 8601 format (e.g., "2026-02-09T18:30:00-05:00")
- `url`: Kalshi Super Bowl market URL
- `polymarket_url`: Polymarket Super Bowl event page
- `[TEAM]_win_odds`: Odds for each playoff team in cents format (e.g., "22¢")
- `explanation`: Standard template mentioning Super Bowl number and market context

**Multi-Team Format Note:**
- Super Bowl markets include 2-4 teams (conference winners or all finalists)
- Only add entries for teams that have qualified for Super Bowl
- Add one `[TEAM]_win_odds` field per team competing

#### Step 4: Replace Expired Super Bowl Markets
**Process:**
1. Identify Super Bowl markets with game times in the past (game already played)
2. Remove completed Super Bowl prediction from JSON
3. Add new upcoming Super Bowl market (once playoff bracket finalized)
4. Update `lastUpdated` timestamp

#### Step 5: Quality Verification
**Before committing:**
- [ ] Both Kalshi and Polymarket URLs functional and load correctly
- [ ] Probabilities verified from live market sources
- [ ] All team probabilities sum to approximately 100¢
- [ ] Super Bowl date is in future
- [ ] Game time is accurate (typically 6:30 PM ET)
- [ ] All competing teams are included with win odds
- [ ] Team abbreviations and full names match NFL standards
- [ ] Teams are confirmed playoff/Super Bowl participants (not speculative)
- [ ] Date format consistent with other prediction markets
- [ ] JSON syntax valid
- [ ] No duplicate Super Bowl entries
- [ ] Explanation accurately describes market type and context

---

## Economic Indicators Update Protocol

### Regular Maintenance Tasks

#### Step 1: Data Sources
**Primary Sources by Indicator:**
- **Federal Reserve**: Industrial Production, Capacity Utilization
- **BLS**: CPI, PPI, Employment data
- **NFIB**: Small Business Optimism
- **Conference Board**: Leading/Coincident/Lagging Indicators
- **Census**: Housing Starts, New Home Sales
- **ADP**: Private Employment
- **FRED**: Various economic series
- **EIA**: Oil prices, energy commodities
- **NYMEX/CME**: Oil futures, commodities pricing

#### Step 2: Update Frequency
- **Monthly**: Most economic indicators (CPI, PPI, Employment, etc.)
- **Weekly**: Jobless Claims, some housing data
- **Bi-weekly**: Industrial Production, some business surveys
- **Daily**: Prediction markets, volatile indicators

#### Step 3: Data Collection Process
1. Visit official agency websites
2. Download latest data releases
3. Update month-by-month values in JSON
4. Calculate MoM/YOY changes if needed
5. Update `lastUpdated` field with current timestamp


---

## Financials.html Display Management SOP

### Indicator Display Categories
The financials.html page organizes indicators into these categories:
- **Business Indicators**: GDP-related, production, PMI data
- **Consumer Indicators**: Spending, confidence, inflation
- **Employment Indicators**: Jobs, wages, labor market
- **Housing Market**: Starts, sales, prices, affordability
- **Commodities**: Oil prices, energy costs, commodity futures
- **Prediction Markets**: NFL games, elections, other predictions

### Adding New Indicators
**Step 1: JSON Structure**
1. Add new indicator object to `indices` array
2. Include all required fields:
   - `category`: Must match existing categories
   - `agency`: Data source organization
   - `name`: Clear, descriptive name
   - `releaseDay`: Day of month data is typically released (1-31)
   - `url`: Official data source URL
   - Monthly data fields (march, april, may, etc.)
   - `change`: Recent change value
   - `explanation`: Detailed description of indicator

**Step 2: Display Integration**
1. No HTML changes required - page auto-generates from JSON
2. Test display in all filter categories
3. Verify chart modal functionality (if applicable)
4. Check responsive design on mobile

### Removing Indicators
**Process:**
1. Remove indicator object from JSON array
2. Update any cross-references in explanations
3. Test page loads without errors
4. Verify filtering still works correctly

### Category Management
**Adding New Categories:**
1. Add new category name to existing list
2. Update category icons mapping in financials.html
3. Test filter buttons include new category
4. Ensure consistent styling

**Category Icons (Lucide):**
```javascript
const categoryIcons = {
    'Employment Indicators': 'users',
    'Housing Market': 'home',
    'Business Indicators': 'briefcase',
    'Consumer Indicators': 'shopping-cart',
    'Commodities': 'droplet',
    'Prediction Markets': 'trending-up'
};
```

---

## Quality Assurance Protocol

### Pre-Update Checks
- [ ] JSON file validates as proper JSON
- [ ] All URLs are accessible and current
- [ ] Odds are verified from live market sources immediately before update
- [ ] Numeric data is properly formatted (no extra characters)
- [ ] Dates are in consistent format
- [ ] No missing required fields
- [ ] Category names match existing categories
- [ ] Prediction markets have both Kalshi and Polymarket URLs

### Post-Update Verification
- [ ] Page loads without console errors
- [ ] All indicators display correctly
- [ ] Filter buttons work for all categories
- [ ] Chart modals open for applicable indicators
- [ ] Mobile responsive design intact
- [ ] Last updated timestamp is current
- [ ] Verify changes with `git diff` to confirm only intended data was added/modified

### Error Handling
**If data source unavailable:**
1. Note in update log which indicators couldn't be updated
2. Use most recent available data
3. Flag for manual follow-up
4. Update `lastUpdated` to reflect partial update

**If JSON syntax error:**
1. Validate JSON using online validator
2. Check for trailing commas, missing quotes
3. Fix syntax before committing
4. Test page load after fix

---

## Automation Opportunities

### Scheduled Updates
- Set up weekly/monthly reminders for regular data updates
- Create scripts to scrape public APIs where available
- Automate prediction market odds fetching

### NFL Prediction Markets Automation (live, Polymarket-backed)
- **Live odds fetcher:** `scripts/fetch-nfl-odds.py` -- queries Polymarket's
  public gamma API (`/events?slug=<slug>`) and rewrites the `<TEAM>_win_odds`
  and `lastUpdated` fields in `json/nfl-games.yml`
- **Merger:** `scripts/apply-nfl-yml.py` -- upserts games into
  `json/financials-data.json` by `id`, with `--replace-completed` to drop past
  games
- **Scheduled run:** `.github/workflows/update-nfl-markets.yml` (daily 08:00
  UTC in season) runs the fetcher, then the merger, validates, and commits
- **Why Polymarket, not NFL.com/ESPN:** the NFL owns its schedule and broadcast
  footage, so official NFL sites are off-limits for scraping. Polymarket is a
  CFTC-regulated prediction-market exchange (not an NFL data feed), so its odds
  are public, machine-readable, and free of NFL intellectual property. The
  World Cup pattern (football-data.org with a free key) is mirrored here.
- **Manual steps:** edit the schedule in `json/nfl-games.yml` (teams, times,
  `polymarket_slug`); the workflow refreshes the odds automatically.

### Data Validation Scripts
- JSON schema validation for indicator objects
- URL accessibility testing
- Date format consistency checks
- Numeric data validation

---

## Performance Guidelines

**Critical:** All data updates must preserve or improve site performance. The site is optimized for Core Web Vitals (LCP, CLS, INP).

### Performance Impact of Data Changes

When updating financial data:

1. **JSON file size:**
   - Keep `financials-data.json` as compact as possible
   - Remove outdated prediction markets (completed games, expired FOMC meetings)
   - Avoid adding unnecessary fields to indicator objects

2. **Chart rendering performance:**
   - Charts load on-demand via IntersectionObserver (visible on scroll)
   - Chart.js loads lazily only when needed
   - Large indicator arrays don't impact initial page load

3. **Data fetching optimization:**
   - Use IndexedDB caching in `media.js` pattern for API responses
   - Implement cache-busting via `meta[name="site-data-version"]` only when necessary
   - Batch API requests where possible

When modifying data:
- Test page load performance after adding new indicators
- Verify LCP (Largest Contentful Paint) is not degraded
- Check CLS (Cumulative Layout Shift) remains low
- Ensure INP (Interaction to Next Paint) stays under 200ms

### Testing Performance

Before deploying data changes:
1. Run `npm run validate` to check JSON validity
2. Test page load in Chrome DevTools Performance tab
3. Check Lighthouse scores (target: 90+ Performance)
4. Verify Core Web Vitals are not degraded
5. Test chart rendering performance with new indicators
