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

## Advanced Usage

**Text Extraction:** For filing content, use direct SEC URLs when edgartools `.text()` fails.

**XBRL Parsing:** Access structured financial data with `filing.xbrl()`.

**MCP Integration:** [MCP server example](https://github.com/modelcontextprotocol/examples) for AI workflows.

**Monitoring:** Daily checks via SEC RSS feeds for new filings.

**Bulk Processing:** Parallel requests with rate limiting for multiple companies.

**Troubleshooting:** See [common configuration issues](https://edgartools.readthedocs.io/en/latest/configuration/) in official docs.