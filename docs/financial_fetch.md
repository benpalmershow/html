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

---

## Prediction Markets Update Protocol

### NFL Game Prediction Updates

#### Step 1: Identify Completed Games
**Process:**
1. Review current NFL games in `financials-data.json` under "Prediction Markets" category
2. Check game dates against current date
3. Identify games where `date` < current date (games that have occurred)

#### Step 2: Research New Games
**Data Sources (in priority order):**
1. **Kalshi** - `kalshi_url` for NFL game odds (Note: Markets may not be available for games more than 2-3 weeks in advance)
2. **Polymarket** - `polymarket_url` for NFL predictions (Note: Markets may not be available for games more than 2-3 weeks in advance)
3. **ESPN/NFL.com** for upcoming game schedules

**Required Data for New Game:**
- Home team vs Away team
- Game date (YYYY-MM-DD format)
- Current odds/percentages from prediction markets
- Kalshi and Polymarket URLs

#### Step 2.5: Verify Win Odds from Market Sources
**CRITICAL: Always verify actual odds from live market data before updating JSON**
**ABSOLUTELY DO NOT enter odds without first verifying from the actual market URLs. Use live data only, not cached or old information. Double-check that odds are current and accurate before committing to JSON.**

**Kalshi Odds Verification:**
1. Visit the Kalshi URL (e.g., `https://kalshi.com/markets/kxnflgame/professional-football-game/kxnflgame-25oct19nygden`)
2. Look for the "Yes" probability for each team outcome
3. Record as `[TEAM]_win_odds`: "[probability]¢" (e.g., "78¢")
4. Ensure probabilities sum to approximately 100¢ (accounting for market fees)

**Polymarket Odds Verification:**
1. Visit the Polymarket URL (e.g., `https://polymarket.com/event/nfl-nyg-den-2025-10-19`)
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
- `url`: Primary Kalshi market URL (format: kxnflgame-YYMMDD[AWAY][HOME] without dashes between team codes)
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
- [ ] Team names spelled correctly
- [ ] JSON syntax valid
- [ ] No duplicate games

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

### Quality Verification for Posts
- [ ] All numbers match exactly with financials-data.json
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
3. Research current odds on Kalshi/Polymarket
4. Create new indicator object:
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
     "MIA_win_odds": "55¢",
     "ATL_win_odds": "45¢",
     "explanation": "NFL game prediction market showing the probability of the Dolphins covering the spread against the Falcons. Odds reflect market expectations for game outcome based on team performance, injuries, and betting patterns."
}
```

5. Update `lastUpdated` timestamp
6. Validate JSON and test page display

---

## Maintenance Schedule

- **Daily**: Check prediction market odds for significant changes
- **Weekly**: Update weekly indicators (jobless claims, etc.)
- **Monthly**: Update monthly economic releases
- **Quarterly**: Review and clean up old prediction markets
- **Annually**: Audit data sources and update URLs as needed</content>
</xai:function_call">﻿<xai:function_call name="todo_write">
<parameter name="todos">[{"content": "Update PRD file for financial page management, including NFL prediction updates and financials.html SOP", "status": "completed", "priority": "high", "id": "update_prd_financial"}]
