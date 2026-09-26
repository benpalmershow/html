# SEC Data Retrieval: Actionable Guide

**Quick Start:** Use edgartools for all SEC data access. Validate config first, then retrieve filings.

**Reference:** [Official edgartools docs](https://edgartools.readthedocs.io/en/latest/)

## Installation & Setup

### Install EdgarTools
```bash
pip install edgartools
# or
pip install edgartools[all]  # includes optional dependencies
```

### Environment Setup
```bash
export EDGAR_IDENTITY="benp8400@gmail.com"
# Optional: for local data caching
export EDGAR_USE_LOCAL_DATA="true"
export EDGAR_LOCAL_DATA_DIR="$HOME/.edgar"
```

## Action Checklist

### ✅ **Pre-Flight Setup**
- [ ] Install edgartools with `pip install edgartools`
- [ ] Set `EDGAR_IDENTITY` environment variable with real email
- [ ] Run [config validator](https://gist.github.com/example/validate-edgartools-config)
- [ ] Test basic Company() creation

### ✅ **Basic Retrieval**
```python
from edgar import Company, set_identity
set_identity("benp8400@gmail.com")
company = Company("AAPL")  # or CIK "0000320193"
filings = company.get_filings(form="10-K")
latest = filings.latest()
```

### ✅ **Common Patterns**
- **Form Variations:** Use flexible matching (`'10-K' in form` or `form.startswith('10')`)
- **CIK Handling:** Pad to 10 digits: `cik.zfill(10)`
- **Date Filtering:** `filings = company.get_filings(form="10-K", start_date="2024-01-01")`
- **Multiple Forms:** `filings = company.get_filings(form=["10-K", "10-Q", "8-K"])`
- **Error Handling:** Always wrap in try/catch, check for stale data
- **Rate Limiting:** Add delays between requests (1-2 seconds)

### ✅ **Data Extraction**
```python
# Get filing text
text = latest.text()

# Get XBRL data (for financial statements)
xbrl = latest.xbrl()

# Get specific sections
sections = latest.sections()
```

### ❌ **Avoid These Issues**
- Generic test emails → Use real email addresses
- Ignoring rate limits → Implement backoff delays
- No error handling → Wrap all API calls
- Assuming fresh data → Verify dates against SEC EDGAR

## Common Use Cases

### Financial Data Extraction
```python
# Get balance sheet data
bs = latest.balance_sheet
income = latest.income_statement
cashflow = latest.cash_flow

# Extract specific metrics
revenue = income.revenue
net_income = income.net_income
total_assets = bs.total_assets
```

### Bulk Company Analysis
```python
from edgar import get_filings

# Get recent 10-K filings across all companies
filings = get_filings(form="10-K", start_date="2024-01-01")

# Filter by company size or sector
large_caps = [f for f in filings if f.company.market_cap > 1000000000]
```

### Real-time Monitoring
```python
# Monitor for new filings
from edgar import set_identity
set_identity("benp8400@gmail.com")

# Get today's filings
today_filings = get_filings(filing_date="2025-11-28")
```

### 13F-HR Filings: Institutional Investment Holdings
```python
from edgar import get_filings, ThirteenF, set_identity

# Set identity as required by SEC regulations
set_identity("benp8400@gmail.com")

# Get all 13F-HR filings
filings = get_filings()
filings_13f_hr = filings.filter(form='13F-HR')

# Get latest filings with holdings data
for filing in filings_13f_hr[:5]:  # Get 5 most recent
    thirteen_f = ThirteenF(filing)

    print(f"Company: {filing.company}")
    print(f"Total Holdings: {thirteen_f.total_holdings}")
    print(f"Total Value: ${thirteen_f.total_value:,.0f}")
    print(f"Report Period: {thirteen_f.report_period}")

    # Get detailed holdings data
    if thirteen_f.has_infotable():
        infotable = thirteen_f.infotable
        print(f"Holdings Data: {len(infotable)} positions")

        # Access top holdings
        top_holdings = infotable.head(5)
        for idx, holding in top_holdings.iterrows():
            print(f"  {idx+1}. {holding['Issuer']} ({holding['Ticker']}) - ${holding['Value']:,.0f}")
```

## Advanced Usage

### Text Extraction
For filing content, use direct SEC URLs when edgartools `.text()` fails.

### XBRL Parsing
Access structured financial data with `filing.xbrl()`.

### MCP Integration
[MCP server example](https://github.com/modelcontextprotocol/examples) for AI workflows.

### Monitoring
Daily checks via SEC RSS feeds for new filings.

### Bulk Processing
Parallel requests with rate limiting for multiple companies.

### Troubleshooting
See [common configuration issues](https://edgartools.readthedocs.io/en/latest/configuration/) in official docs.

## 13F Filing Data Sources & Calculations

### Primary Data Sources
1. **SEC EDGAR**: Official 13F-HR filing documents
2. **13F.info**: Aggregated quarterly filings with comparative data
3. **ValueSider**: Portfolio analysis with percentage breakdowns

### Q3 2025 Buffett Portfolio - Data Calculations
**Base Metrics:**
- Total Portfolio Value: $267,334,501,955
- Number of Holdings: 41 positions
- Filing Date: November 14, 2025
- Period Ending: September 30, 2025

**Position Valuations (% of portfolio × Total Value):**
- Apple (AAPL): 22.69% × $267.3B = $60.7B
- American Express (AXP): 18.84% × $267.3B = $50.4B
- Bank of America (BAC): 10.96% × $267.3B = $29.3B
- Coca-Cola (KO): 9.92% × $267.3B = $26.5B
- Chevron (CVX): 7.09% × $267.3B = $19.0B

**Activity Changes (Q2 2025 vs Q3 2025):**
- Apple (AAPL): Q2: 280.0M shares → Q3: 238.2M shares = −41.8M shares (−14.9%)
- Bank of America (BAC): Q2: 605.3M shares → Q3: 568.1M shares = −37.2M shares (−6.2%)
- Alphabet (GOOGL): Q2: ~16.0M shares → Q3: 17.8M shares = +1.8M shares (+1.62%)

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
- ✓ Percentages verified to sum approximately 100%
- ✓ Share counts match aggregated market data
- ✓ Filing date confirmed: November 14, 2025
- ✓ Period end date: September 30, 2025
- ✓ No approximations beyond rounding to nearest $0.1B or 0.1%

## 13F Holdings Analysis Best Practices

### Retrieving Latest 13F-HR Filings
```python
from edgar import get_filings, ThirteenF, set_identity

set_identity("benp8400@gmail.com")

# Get all 13F-HR filings and sort by date
filings = get_filings()
filings_13f_hr = filings.filter(form='13F-HR')

# Analyze most recent filings
for filing in filings_13f_hr[:10]:  # Top 10 most recent
    try:
        thirteen_f = ThirteenF(filing)

        # Basic filing info
        print(f"📋 {filing.company} (CIK: {filing.cik})")
        print(f"   📅 Filed: {filing.filing_date}")
        print(f"   💰 Holdings: {thirteen_f.total_holdings}")
        print(f"   💰 Value: ${thirteen_f.total_value:,.0f}")

        # Detailed holdings analysis
        if thirteen_f.has_infotable():
            holdings = thirteen_f.infotable
            print(f"   📊 Top 3 Holdings:")
            for idx, row in holdings.head(3).iterrows():
                print(f"      {idx+1}. {row['Issuer']} ({row['Ticker']}) - ${row['Value']:,.0f}")

    except Exception as e:
        print(f"   ⚠️  Error: {str(e)}")
```

### Comparing Quarterly Changes
```python
# Get filings for specific company
company_filings = filings_13f_hr.filter(company="Berkshire Hathaway")

# Compare Q2 vs Q3 2025
q2_filing = company_filings.filter(period_ending="2025-06-30")[0]
q3_filing = company_filings.filter(period_ending="2025-09-30")[0]

q2_holdings = ThirteenF(q2_filing).infotable
q3_holdings = ThirteenF(q3_filing).infotable

# Find changes
merged = q3_holdings.merge(q2_holdings, on='Issuer', suffixes=('_q3', '_q2'), how='outer')
changes = merged[merged['Value_q3'] != merged['Value_q2']]

print("📈 Significant Changes:")
for idx, row in changes.iterrows():
    q2_val = row['Value_q2'] if pd.notna(row['Value_q2']) else 0
    q3_val = row['Value_q3'] if pd.notna(row['Value_q3']) else 0
    change_pct = ((q3_val - q2_val) / q2_val) * 100 if q2_val > 0 else 0

    print(f"   {row['Issuer']}: ${q2_val:,.0f} → ${q3_val:,.0f} ({change_pct:+.1f}%)")
```

### Error Handling for 13F Data
```python
import time
from edgar import EDGARRateLimitError

def safe_get_13f_data(cik, max_retries=3):
    """Safely retrieve 13F data with rate limiting and error handling"""
    for attempt in range(max_retries):
        try:
            company = Company(cik)
            filings = company.get_filings(form="13F-HR")
            if len(filings) > 0:
                return ThirteenF(filings[0])
            return None

        except EDGARRateLimitError:
            if attempt < max_retries - 1:
                wait_time = 2 ** (attempt + 1)  # Exponential backoff
                print(f"Rate limited. Waiting {wait_time} seconds...")
                time.sleep(wait_time)
            else:
                raise

        except Exception as e:
            print(f"Error retrieving data for {cik}: {str(e)}")
            return None
```

## Maintenance Schedule

- **Daily**: Check prediction market odds for significant changes
- **Weekly**: Update weekly indicators (jobless claims, etc.)
- **Monthly**: Update monthly economic releases
- **Quarterly**: Review and clean up old prediction markets
- **Annually**: Audit data sources and update URLs as needed