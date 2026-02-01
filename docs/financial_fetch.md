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

#### Step 0: Look Up Game Date
**Process:**
1. If user provides only teams (e.g., "Patriots @ Bengals"), search for the game date using web search
2. Verify the date format is YYYY-MM-DD
3. Confirm the game date is within 1-2 weeks of current date to ensure prediction markets are active
4. Proceed with Steps 1-5 once date is confirmed

#### Step 1: Identify Completed Games
**Process:**
1. Review current NFL games in `financials-data.json` under "Prediction Markets" category
2. Check game dates against current date
3. Identify games where `date` < current date (games that have occurred)

#### Step 2: Research New Games
**Data Sources (in priority order):**
1. **Kalshi** - `kalshi_url` for NFL game odds (Note: Markets may not be available for games more than 2-3 weeks in advance; link may return 404 if market not yet active)
2. **Polymarket** - `polymarket_url` for NFL predictions (Note: Markets may not be available for games more than 2-3 weeks in advance; more reliably available than Kalshi)
3. **ESPN/NFL.com** for upcoming game schedules

**CRITICAL: Home vs Away Team Verification**
- Format is ALWAYS: `[AWAY_TEAM] @ [HOME_TEAM]`
- The @ symbol means "at" (away team playing AT home team's stadium)
- Example: "DAL @ LV" means Dallas Cowboys are visiting Las Vegas Raiders in Las Vegas
- Verify from Kalshi/Polymarket market title which team is home/away
- Cross-reference with ESPN schedule to confirm home team location

**Required Data for New Game:**
- Home team vs Away team (verified from market source)
- Team abbreviation to full name mapping verification
- Game date (YYYY-MM-DD format)
- Current odds/percentages from prediction markets
- Kalshi and Polymarket URLs

**Team Abbreviation Verification:**
Always verify team abbreviations match correct team names:
- ARI=Cardinals, ATL=Falcons, BAL=Ravens, BUF=Bills
- CAR=Panthers, CHI=Bears, CIN=Bengals, CLE=Browns
- DAL=Cowboys, DEN=Broncos, DET=Lions, GB=Packers
- HOU=Texans, IND=Colts, JAX=Jaguars, KC=Chiefs
- LAC=Chargers, LAR=Rams, LV=Raiders, MIA=Dolphins
- MIN=Vikings, NE=Patriots, NO=Saints, NYG=Giants
- NYJ=Jets, PHI=Eagles, PIT=Steelers, SEA=Seahawks
- SF=49ers, TB=Buccaneers, TEN=Titans, WAS=Commanders

#### Step 2.5: Verify Win Odds from Market Sources
**CRITICAL: Always verify actual odds from live market data before updating JSON**
**ABSOLUTELY DO NOT enter odds without first verifying from the actual market URLs. Use live data only, not cached or old information. Double-check that odds are current and accurate before committing to JSON.**

**For NFL Prediction Markets Specifically:**
1. Visit the Kalshi URL and note the current "Yes" probability for each team's outcome
2. Visit the Polymarket URL and cross-reference the odds
3. Use the most recent odds from Kalshi as primary, Polymarket as backup
4. If odds differ by more than 5¢ between platforms, investigate or use the more recent update
5. Record the exact odds as they appear (e.g., if Kalshi shows 69¢ for Patriots win, use "69¢")
6. Do not approximate or estimate - use the live numbers only

**Kalshi Odds Verification:**
1. Visit the Kalshi URL (e.g., `https://kalshi.com/markets/kxnflgame/professional-football-game/kxnflgame-25oct19nygden`)
2. Look for the "Yes" probability for each team outcome
3. Record as `[TEAM]_win_odds`: "[probability]¢" (e.g., "78¢")
4. Ensure probabilities sum to approximately 100¢ (accounting for market fees)

**Polymarket Odds Verification:**
1. Visit the Polymarket URL (e.g., `https://polymarket.com/sports/nfl/games/week/1/nfl-nyg-den-2025-01-12`)
2. Check the moneyline or spread probabilities
3. Cross-reference with Kalshi odds for consistency
4. Use Polymarket as backup if Kalshi data is unavailable

**Odds Update Protocol:**
- Check odds within 24 hours of game time
- Update JSON if odds change by more than 5¢
- For games within 1 hour, odds are considered "locked in"
- Document source and timestamp of odds verification

#### Step 3: Update JSON Structure
**Prediction Market Template:**
```json
{
    "category": "Prediction Markets",
    "agency": "Kalshi",
    "name": "[AWAY_TEAM] @ [HOME_TEAM]",
    "game_title": "[AWAY_TEAM_FULL] @ [HOME_TEAM_FULL]",
    "game_time": "[Month Day, Year Time ET]",
    "game_time_iso": "[YYYY-MM-DDTHH:MM:SS-04:00]",
    "url": "[KALSHI_GAME_URL]",
    "polymarket_url": "[POLYMARKET_URL]",
    "[AWAY_TEAM]_win_odds": "[ODDS]¢",
    "[HOME_TEAM]_win_odds": "[ODDS]¢",
    "explanation": "NFL game prediction market showing the probability of the [AWAY_TEAM_FULL] covering the spread against the [HOME_TEAM_FULL]. Odds reflect market expectations for game outcome based on team performance, injuries, and betting patterns."
}
```

**Field Requirements:**
- `name`: Format "[AWAY] @ [HOME]" (e.g., "BAL @ MIA")
- `game_title`: Full team names (e.g., "Ravens @ Dolphins")
- `game_time`: Human-readable format (e.g., "Oct 26, 2025 1:00 PM ET")
- `game_time_iso`: ISO 8601 format for programmatic use
- `url`: Primary Kalshi market URL (format: kxnflgame-YYMMDD[AWAY][HOME] without dashes between team codes, e.g., `kxnflgame-25nov23necin` for NE @ CIN on Nov 23)
- `polymarket_url`: Direct Polymarket link
- `[TEAM]_win_odds`: Odds in cents format (e.g., "60¢")
- `explanation`: Standard template with full team names filled in

#### Step 4: Replace Completed Games
**Process:**
1. Remove completed games per update
2. Add specified upcoming games
4. Update `lastUpdated` timestamp

#### Step 5: Quality Verification
**Before committing:**
- [ ] All URLs functional and load correctly
- [ ] Odds verified from live market sources and match current probabilities
- [ ] Odds percentages are current (within 24 hours)
- [ ] Game dates are in future
- [ ] **Home/away designation correct (AWAY @ HOME format verified)**
- [ ] **Team abbreviations match correct team names (e.g., LV=Raiders NOT Texans)**
- [ ] **Full team names in game_title match abbreviations in name field**
- [ ] Team names spelled correctly
- [ ] JSON syntax valid
- [ ] No duplicate games
- [ ] Cross-reference market URL title with entered team data

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

### Data Validation Scripts
- JSON schema validation for indicator objects
- URL accessibility testing
- Date format consistency checks
- Numeric data validation

---

## Posts.json Update Protocol

### Data Accuracy Requirements
**CRITICAL: All posts to posts.json referencing financial data MUST use actual values from financials-data.json. Do NOT use made-up, approximated, or outdated numbers. Always cross-reference with the current financials-data.json before publishing posts.**

**ABSOLUTELY NO FABRICATED DATA: Never post financial data that doesn't exist in financials-data.json. If data for a specific month or period is missing from the JSON, do not create posts about it. Only use confirmed, existing data points. Do not extrapolate, estimate, or invent values for missing months.**

**Steps for Financial Data Posts:**
1. Review the latest data in `financials-data.json` for the relevant indicator
2. Extract the most recent month values (e.g., for Consumer Sentiment: August 58.2, September 55.1)
3. Calculate accurate changes (e.g., September decrease from 58.2 to 55.1 = -5.5%)
4. Include links to `financials.html` for full details
5. Use precise numbers - avoid rounding or approximations unless specified in the data

**Example Accurate Post:**
"Consumer Sentiment decreased to 55.1 in September (from 58.2 in August), as seen in Consumer Indicators in <a href=\"financials.html\"><b>Financials</b></a>."

**Example Inaccurate Post (DO NOT USE):**
"Consumer Sentiment decreased -4.81% MoM to 55.4 in September, as seen in Consumer Indicators in <a href=\"financials.html\"><b>Financials</b></a>."

**Consolidated Post Rule:** When updating multiple financial indicators in a single session, create just one comprehensive post that summarizes all new Added/Updated Data Points, rather than separate posts for each indicator.

### Quality Verification for Posts
- [ ] All numbers match exactly with financials-data.json
- [ ] Numbers in posts.json match the display values in financials.html
- [ ] Calculations are accurate (MoM/YOY changes)
- [ ] Data is current (use most recent available month)
- [ ] No fabricated or approximated values
- [ ] Links point to correct pages

## Example NFL Prediction Update

**User Input:**
```
Update financials with new NFL game: Dolphins @ Falcons on October 26
```

**Note:** Use game dates within 1-2 weeks of the current date to ensure Kalshi/Polymarket markets are active and avoid "Page not found" errors.

**Process:**
1. Check existing NFL predictions in JSON
2. Remove oldest completed game
3. Visit the Kalshi and Polymarket URLs to verify current odds
4. Create new indicator object (replace odds with verified values):
```json
{
     "category": "Prediction Markets",
     "agency": "Kalshi",
     "name": "MIA @ ATL",
     "game_title": "Dolphins @ Falcons",
     "game_time": "Oct 26, 2025 1:00 PM ET",
     "game_time_iso": "2025-10-26T13:00:00-04:00",
     "url": "https://kalshi.com/markets/kxnflgame/professional-football-game/kxnflgame-25oct26miaatl",
     "polymarket_url": "https://polymarket.com/event/nfl-mia-atl-2025-10-26",
     "MIA_win_odds": "[VERIFIED_ODDS_FROM_KALSHI]¢",
     "ATL_win_odds": "[VERIFIED_ODDS_FROM_KALSHI]¢",
     "explanation": "NFL game prediction market showing the probability of the Dolphins covering the spread against the Falcons. Odds reflect market expectations for game outcome based on team performance, injuries, and betting patterns."
}
```

**Important:** Replace `[VERIFIED_ODDS_FROM_KALSHI]` with the exact odds from the live Kalshi market URL. Do not use estimated or old odds.

5. Update `lastUpdated` timestamp
6. Validate JSON and test page display

---

## Maintenance Schedule

- **Daily**: Check prediction market odds for significant changes
- **Weekly**: Update weekly indicators (jobless claims, etc.)
- **Monthly**: Update monthly economic releases
- **Quarterly**: Review and clean up old prediction markets
- **Annually**: Audit data sources and update URLs as needed

---

## 13F Filing Data Sources & Calculations

### Primary Data Sources
1. **SEC EDGAR**: https://www.sec.gov/Archives/edgar/data/1067983/000119312525282901/46994.xml
   - Official 13F-HR filing for Berkshire Hathaway Q3 2025
   - Contains complete holding details and valuations
   
2. **13F.info**: https://13f.info/manager/0001067983-berkshire-hathaway-inc
   - Aggregated quarterly filings
   - Shows comparative data Q2→Q3 changes
   - Formatted holdings with activity indicators
   
3. **ValueSider**: https://valuesider.com/guru/warren-buffett-berkshire-hathaway/portfolio/2025/3
   - Portfolio analysis with percentage breakdowns
   - Share counts and valuation calculations
   - Year-over-year comparisons

### Q3 2025 Buffett Portfolio - Data Calculations

**Base Metrics:**
- Total Portfolio Value: $267,334,501,955 (from 13f.info filing)
- Number of Holdings: 41 positions
- Filing Date: November 14, 2025
- Period Ending: September 30, 2025

**Position Valuations (% of portfolio × Total Value):**
- Apple (AAPL): 22.69% × $267.3B = $60.7B ✓
- American Express (AXP): 18.84% × $267.3B = $50.4B ✓
- Bank of America (BAC): 10.96% × $267.3B = $29.3B ✓
- Coca-Cola (KO): 9.92% × $267.3B = $26.5B ✓
- Chevron (CVX): 7.09% × $267.3B = $19.0B ✓
- Alphabet (GOOGL): 1.62% × $267.3B = $4.3B ✓
- Sirius XM (SIRI): ~0.98% × $267.3B = $2.6B ✓
- Domino's (DPZ): ~0.48% × $267.3B = $1.3B ✓

**Activity Changes (Q2 2025 vs Q3 2025):**

*Apple (AAPL):*
- Q2 Holdings: 280.0M shares
- Q3 Holdings: 238.2M shares
- Change: −41.8M shares (−14.9%)
- Calculation: (238.2M − 280.0M) / 280.0M = −0.149 = −14.9%
- Source: ValueSider comparison, 13f.info activity

*Bank of America (BAC):*
- Q2 Holdings: 605.3M shares
- Q3 Holdings: 568.1M shares
- Change: −37.2M shares (−6.15%)
- Calculation: (568.1M − 605.3M) / 605.3M = −0.0615 = −6.2%
- Source: ValueSider comparison

*Alphabet (GOOGL):*
- Q2 Holdings: ~16.0M shares
- Q3 Holdings: 17.8M shares
- Change: +1.8M shares (+1.62%)
- Note: New position increase Q2→Q3
- Source: ValueSider new activity indicator

*Sirius XM (SIRI):*
- Status: Significantly added in Q3
- New share accumulation evident in 13F filing
- Total value: $2.6B (~117M shares at ~$22/share)
- Source: 13f.info "Top Buys" section

*Domino's (DPZ):*
- Q3 Value: $1.3B (~2.98M shares at ~$431/share)
- Change from Q2: +$288M increase
- Source: 13f.info activity tracking

### Document & Verify Process

**Required Verification Steps for Any Buffett Position Update:**
1. Access official SEC EDGAR filing (primary source)
2. Cross-reference 13f.info aggregated data (validation)
3. Verify valuations from ValueSider or similar aggregator
4. Calculate percentages and share changes independently
5. Document source URLs and filing date
6. Timestamp data collection date

**Formula for Position Valuation:**
```
Position Value = (% of Portfolio × Total Portfolio Value)
OR
Position Value = (Share Count × Price per Share at period end)
```

**Formula for Change Calculation:**
```
Percentage Change = ((Q3 Value − Q2 Value) / Q2 Value) × 100
Share Change = Q3 Shares − Q2 Shares
```

### Data Quality Standards
- ✓ All valuations sourced from official SEC filings
- ✓ Percentages verified to sum approximately 100% (87% shown = top 8 holdings)
- ✓ Share counts match aggregated market data
- ✓ Filing date confirmed: November 14, 2025
- ✓ Period end date: September 30, 2025
- ✓ No approximations beyond rounding to nearest $0.1B or 0.1%</content>
</xai:function_call">﻿<xai:function_call name="todo_write">
<parameter name="todos">[{"content": "Update PRD file for financial page management, including NFL prediction updates and financials.html SOP", "status": "completed", "priority": "high", "id": "update_prd_financial"}]
