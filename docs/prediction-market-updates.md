# Prediction Market Updates

This document describes the hybrid approach for keeping prediction market data fresh and informing readers of significant changes.

## Automated Updates

### Script: `scripts/fetch-polymarket-odds.py`
- Fetches current odds from Polymarket's Gamma API
- Handles both binary (yes/no) and multi-outcome markets
- Updates entries in `json/financials-data.json`
- Only commits when odds actually change
- Skips entries updated within the last 30 minutes (configurable via `--min-age`)

### Workflow: `.github/workflows/update-polymarket-odds.yml`
- Runs every 30 minutes via GitHub Actions
- Updates all Polymarket prediction market entries
- Commits changes with `[skip ci]` to avoid triggering other workflows
- Rate-limited to avoid API abuse

### Usage
```bash
# Manual update of all Polymarket markets
python3 scripts/fetch-polymarket-odds.py

# Update a specific market
python3 scripts/fetch-polymarket-odds.py --id faa-groundstop-lifted

# Change minimum age threshold (default: 30 minutes)
python3 scripts/fetch-polymarket-odds.py --min-age 60
```

## Manual Journal Posts

For fast-moving events or significant market shifts, add journal entries to provide context and alert readers.

### When to Post
Add a journal entry when:
- A leading outcome probability changes by >10%
- A new outcome becomes the market leader
- A market resolves (groundstop lifted, election called, etc.)
- Major news affects the market's context

### Format
```json
{
  "date": "11/13/26",
  "entries": [
    {
      "title": "📊 FAA Ground Stop: odds now show 96% for 2-day lift",
      "content": "The market has shifted significantly, with the 2-day window now the clear favorite. [View indicators](financials.html?indicator=FAA Ground Stop)"
    }
  ]
}
```

### Template
```
📊 [Market Name]: odds now show X% for [outcome] (was Y%)

[Optional: brief context about what changed]

[View indicators](financials.html?indicator=[Market Name])
```

## Best Practices

1. **Automated updates handle routine refreshes** - The workflow keeps odds current without manual intervention
2. **Journal posts add narrative value** - Use them to explain why odds shifted, not just that they did
3. **Link back to financials page** - Always include `financials.html?indicator=[Name]` so readers can see the live data
4. **Be concise** - Journal entries should be brief (1-2 sentences of context)
5. **Time-sensitive events** - For events like the FAA groundstop, journal posts are especially valuable since the situation evolves quickly

## Examples

### Binary Market (Yes/No)
```
📊 US Recession in 2027: odds now show 28% for recession (was 32%)

New employment data suggests softer landing. [View indicators](financials.html?indicator=US Recession in 2027)
```

### Multi-Outcome Market
```
📊 FAA Ground Stop: odds now show 96% for 2-day lift (was 97%)

Slight decrease as FAA technicians report progress on communication system. [View indicators](financials.html?indicator=FAA Ground Stop)
```

### Market Resolution
```
📊 Senate 2026: Market resolved to Democratic Party (100%)

Polymarket confirmed after November 3, 2026 elections. [View indicators](financials.html?indicator=Senate)
```
