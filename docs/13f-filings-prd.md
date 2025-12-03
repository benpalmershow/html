# 13F Filings Product Requirements Document

## Overview

This document outlines the standard operating procedures for retrieving, analyzing, and managing 13F-HR filings using the edgartools package. 13F-HR filings are quarterly reports filed by institutional investment managers with over $100 million in qualifying assets under management.

## Installation & Configuration

### Prerequisites
```bash
pip install edgartools
export EDGAR_IDENTITY="benp8400@gmail.com"
```

### Environment Variables
```bash
# Required
export EDGAR_IDENTITY="your_email@example.com"

# Optional for caching
export EDGAR_USE_LOCAL_DATA="true"
export EDGAR_LOCAL_DATA_DIR="$HOME/.edgar"
```

## Standard Operating Procedures

### 1. Basic 13F-HR Retrieval
```python
from edgar import get_filings, ThirteenF, set_identity

# Initialize with identity
set_identity("benp8400@gmail.com")

# Get all 13F-HR filings
filings = get_filings()
filings_13f_hr = filings.filter(form='13F-HR')

print(f"Found {len(filings_13f_hr)} 13F-HR filings")
```

### 2. Analyzing Latest Filings
```python
# Get 5 most recent filings with detailed analysis
for filing in filings_13f_hr[:5]:
    thirteen_f = ThirteenF(filing)

    print(f"\n📋 {filing.company} (CIK: {filing.cik})")
    print(f"   📅 Filed: {filing.filing_date}")
    print(f"   🔢 Accession: {filing.accession_no}")
    print(f"   💰 Total Holdings: {thirteen_f.total_holdings}")
    print(f"   💰 Total Value: ${thirteen_f.total_value:,.0f}")
    print(f"   📅 Report Period: {thirteen_f.report_period}")

    # Get holdings data if available
    if thirteen_f.has_infotable():
        holdings = thirteen_f.infotable
        print(f"   📊 Holdings: {len(holdings)} positions")

        # Show top 3 holdings
        top_3 = holdings.head(3)
        for idx, row in top_3.iterrows():
            issuer = row['Issuer']
            ticker = row['Ticker'] if pd.notna(row['Ticker']) else 'N/A'
            value = row['Value']
            shares = row['SharesPrnAmount']
            print(f"      {idx+1}. {issuer} ({ticker}) - ${value:,.0f}")
```

### 3. Quarterly Comparison Analysis
```python
def compare_quarterly_changes(company_name, q2_date, q3_date):
    """Compare 13F holdings between two quarters"""
    company_filings = filings_13f_hr.filter(company=company_name)

    # Get specific quarter filings
    q2_filing = company_filings.filter(period_ending=q2_date)[0]
    q3_filing = company_filings.filter(period_ending=q3_date)[0]

    # Create ThirteenF objects
    q2_13f = ThirteenF(q2_filing)
    q3_13f = ThirteenF(q3_filing)

    # Get holdings data
    q2_holdings = q2_13f.infotable
    q3_holdings = q3_13f.infotable

    # Merge and find changes
    merged = q3_holdings.merge(q2_holdings, on='Issuer',
                              suffixes=('_q3', '_q2'), how='outer')

    # Calculate changes
    changes = []
    for idx, row in merged.iterrows():
        q2_val = row['Value_q2'] if pd.notna(row['Value_q2']) else 0
        q3_val = row['Value_q3'] if pd.notna(row['Value_q3']) else 0

        if q2_val != q3_val:
            change_pct = ((q3_val - q2_val) / q2_val) * 100 if q2_val > 0 else 0
            changes.append({
                'issuer': row['Issuer'],
                'q2_value': q2_val,
                'q3_value': q3_val,
                'change_pct': change_pct,
                'ticker': row['Ticker_q3'] if pd.notna(row['Ticker_q3']) else row['Ticker_q2']
            })

    return changes

# Example usage
changes = compare_quarterly_changes("Berkshire Hathaway", "2025-06-30", "2025-09-30")

print("📈 Quarterly Changes:")
for change in changes:
    print(f"   {change['issuer']} ({change['ticker']}): "
          f"${change['q2_value']:,.0f} → ${change['q3_value']:,.0f} "
          f"({change['change_pct']:+.1f}%)")
```

### 4. Bulk Analysis of Multiple Firms
```python
def analyze_top_firms(top_n=10):
    """Analyze holdings of top N firms by total value"""
    # Get filings and sort by total value
    firm_data = []
    for filing in filings_13f_hr[:top_n]:
        try:
            thirteen_f = ThirteenF(filing)
            firm_data.append({
                'company': filing.company,
                'cik': filing.cik,
                'total_value': thirteen_f.total_value,
                'total_holdings': thirteen_f.total_holdings,
                'report_period': thirteen_f.report_period,
                'filing_date': filing.filing_date
            })
        except Exception as e:
            print(f"Error processing {filing.company}: {str(e)}")

    # Convert to DataFrame and sort
    df = pd.DataFrame(firm_data)
    df = df.sort_values('total_value', ascending=False)

    return df

# Get top 10 firms by portfolio value
top_firms = analyze_top_firms(10)
print("🏆 Top 10 Firms by Portfolio Value:")
print(top_firms[['company', 'total_value', 'total_holdings']])
```

## Data Quality & Validation

### Verification Checklist
- [ ] Identity properly set with `set_identity()`
- [ ] Filings filtered correctly for form '13F-HR'
- [ ] ThirteenF objects created successfully
- [ ] Holdings data retrieved and validated
- [ ] Error handling implemented for rate limits
- [ ] Data cross-referenced with official SEC sources

### Common Issues & Solutions

**Issue: Rate Limiting**
```python
import time
from edgar import EDGARRateLimitError

def safe_retrieve_with_retry(cik, max_retries=3):
    for attempt in range(max_retries):
        try:
            company = Company(cik)
            filings = company.get_filings(form="13F-HR")
            return filings

        except EDGARRateLimitError:
            if attempt < max_retries - 1:
                wait_time = 2 ** (attempt + 1)
                time.sleep(wait_time)
            else:
                raise
```

**Issue: Missing Holdings Data**
```python
if thirteen_f.has_infotable():
    holdings = thirteen_f.infotable
    # Process holdings
else:
    print(f"No infotable available for {filing.company}")
    # Fallback to alternative data sources
```

## Error Handling Best Practices

### Comprehensive Error Handling
```python
def get_13f_data_safely(cik):
    """Robust 13F data retrieval with comprehensive error handling"""
    try:
        # Validate CIK format
        if not isinstance(cik, str) or len(cik) != 10 or not cik.isdigit():
            raise ValueError(f"Invalid CIK format: {cik}")

        # Get company and filings
        company = Company(cik)
        filings = company.get_filings(form="13F-HR")

        if len(filings) == 0:
            return {"error": "No 13F-HR filings found", "cik": cik}

        # Get most recent filing
        latest_filing = filings[0]
        thirteen_f = ThirteenF(latest_filing)

        # Prepare result
        result = {
            "company": company.name,
            "cik": cik,
            "filing_date": str(latest_filing.filing_date),
            "report_period": thirteen_f.report_period,
            "total_holdings": thirteen_f.total_holdings,
            "total_value": float(thirteen_f.total_value),
            "has_infotable": thirteen_f.has_infotable(),
            "success": True
        }

        # Add holdings data if available
        if thirteen_f.has_infotable():
            holdings = thirteen_f.infotable
            result["holdings"] = holdings.to_dict('records')

        return result

    except EDGARRateLimitError as e:
        return {"error": "Rate limited", "retry_after": 60, "success": False}
    except ValueError as e:
        return {"error": str(e), "success": False}
    except Exception as e:
        return {"error": f"Unexpected error: {str(e)}", "success": False}
```

## Performance Optimization

### Caching Strategies
```python
from functools import lru_cache

@lru_cache(maxsize=100)
def get_cached_13f_data(cik):
    """Cache 13F data to avoid repeated API calls"""
    return get_13f_data_safely(cik)

# Usage
data = get_cached_13f_data("0001067983")  # Berkshire Hathaway
```

### Batch Processing
```python
def process_multiple_firms(cik_list, batch_size=5):
    """Process multiple firms with rate limiting"""
    results = []

    for i, cik in enumerate(cik_list):
        try:
            result = get_13f_data_safely(cik)
            results.append(result)

            # Rate limiting
            if (i + 1) % batch_size == 0 and i < len(cik_list) - 1:
                print(f"Processed {i+1}/{len(cik_list)} firms. Pausing...")
                time.sleep(2)  # 2 second delay between batches

        except Exception as e:
            results.append({"cik": cik, "error": str(e), "success": False})

    return results
```

## Integration with Financial Analysis

### Portfolio Composition Analysis
```python
def analyze_portfolio_composition(cik):
    """Analyze portfolio composition by sector/industry"""
    data = get_13f_data_safely(cik)

    if not data.get('success') or not data.get('has_infotable'):
        return None

    holdings = pd.DataFrame(data['holdings'])

    # Add sector classification (simplified example)
    sector_mapping = {
        'AAPL': 'Technology', 'MSFT': 'Technology', 'GOOGL': 'Technology',
        'JPM': 'Financial', 'BAC': 'Financial', 'WFC': 'Financial',
        'XOM': 'Energy', 'CVX': 'Energy', 'COP': 'Energy'
    }

    holdings['sector'] = holdings['Ticker'].map(sector_mapping)
    holdings['sector'] = holdings['sector'].fillna('Other')

    # Group by sector
    sector_analysis = holdings.groupby('sector')['Value'].sum().sort_values(ascending=False)
    sector_analysis = sector_analysis.apply(lambda x: x / 1e9)  # Convert to billions

    return {
        'portfolio_value': data['total_value'] / 1e9,
        'sector_breakdown': sector_analysis.to_dict(),
        'top_holdings': holdings.head(5).to_dict('records')
    }
```

## Maintenance & Monitoring

### Scheduled Updates
```python
def get_latest_13f_updates(days_back=7):
    """Get 13F filings from the last N days"""
    today = datetime.now()
    start_date = today - timedelta(days=days_back)

    # Get recent filings
    recent_filings = filings_13f_hr.filter(
        filing_date__gte=start_date.strftime('%Y-%m-%d')
    )

    print(f"📊 Found {len(recent_filings)} new 13F filings in last {days_back} days")

    # Process new filings
    new_data = []
    for filing in recent_filings:
        try:
            thirteen_f = ThirteenF(filing)
            new_data.append({
                'company': filing.company,
                'cik': filing.cik,
                'filing_date': filing.filing_date,
                'total_value': thirteen_f.total_value,
                'holdings_count': thirteen_f.total_holdings
            })
        except Exception as e:
            print(f"Error processing {filing.company}: {str(e)}")

    return pd.DataFrame(new_data)
```

## Documentation & Reporting

### Generating 13F Reports
```python
def generate_13f_report(cik, output_format='markdown'):
    """Generate comprehensive 13F report"""
    data = get_13f_data_safely(cik)

    if not data.get('success'):
        return f"Error: {data.get('error', 'Unknown error')}"

    if output_format == 'markdown':
        report = f"# 13F Report: {data['company']}\n\n"

        report += f"**CIK:** {data['cik']}\n\n"
        report += f"**Filing Date:** {data['filing_date']}\n\n"
        report += f"**Report Period:** {data['report_period']}\n\n"
        report += f"**Total Holdings:** {data['total_holdings']}\n\n"
        report += f"**Total Value:** ${data['total_value']:,.0f}\n\n"

        if data.get('has_infotable'):
            report += "## Top 10 Holdings\n\n"
            report += "| # | Issuer | Ticker | Value |\n"
            report += "|---|--------|--------|-------|\n"

            for i, holding in enumerate(data['holdings'][:10], 1):
                report += f"| {i} | {holding['Issuer']} | {holding['Ticker']} | ${holding['Value']:,.0f} |\n"

        return report

    elif output_format == 'json':
        return json.dumps(data, indent=2)

    else:
        return str(data)
```

## Best Practices Summary

### Do's and Don'ts

**✅ DO:**
- Always set identity before making requests
- Use proper error handling and rate limiting
- Validate data against official sources
- Cache results to minimize API calls
- Document data sources and retrieval dates

**❌ DON'T:**
- Make requests without identity set
- Ignore rate limits and errors
- Assume data is current without verification
- Hardcode values that should be dynamic
- Store sensitive data in version control

### Performance Tips
- Use caching for repeated requests
- Implement batch processing with delays
- Filter data early to minimize processing
- Use pandas for efficient data manipulation
- Monitor API usage to stay within limits

## Troubleshooting Guide

### Common Error Messages

**`EDGARRateLimitError`**
- Solution: Implement exponential backoff
- Example: Wait 2, 4, 8 seconds between retries

**`ModuleNotFoundError: No module named 'edgar'`**
- Solution: Install package `pip install edgartools`
- Verify: `python -c "import edgar; print('Success')"`

**`AttributeError: 'str' object has no attribute 'form'`**
- Solution: Ensure proper filing object is passed to ThirteenF
- Check: `print(type(filing))` should show edgar filing object

**`ConnectionError: Failed to fetch data`**
- Solution: Check internet connection and SEC EDGAR status
- Retry: After network verification

### Debugging Techniques
```python
# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Test basic connectivity
try:
    from edgar import get_filings
    filings = get_filings(form="13F-HR", limit=5)
    print(f"✅ Connection successful: {len(filings)} filings retrieved")
except Exception as e:
    print(f"❌ Connection failed: {str(e)}")
```

## Appendix: Useful Code Snippets

### Export to CSV
```python
def export_holdings_to_csv(cik, filename="holdings.csv"):
    """Export 13F holdings to CSV"""
    data = get_13f_data_safely(cik)

    if data.get('has_infotable'):
        holdings_df = pd.DataFrame(data['holdings'])
        holdings_df.to_csv(filename, index=False)
        return f"✅ Exported {len(holdings_df)} holdings to {filename}"
    else:
        return "❌ No holdings data available"
```

### Compare Multiple Firms
```python
def compare_firms(cik_list):
    """Compare portfolio metrics across multiple firms"""
    comparison_data = []

    for cik in cik_list:
        data = get_13f_data_safely(cik)
        if data.get('success'):
            comparison_data.append({
                'cik': cik,
                'company': data.get('company', 'N/A'),
                'total_value': data.get('total_value', 0),
                'total_holdings': data.get('total_holdings', 0),
                'avg_position': data.get('total_value', 0) / max(1, data.get('total_holdings', 1))
            })

    comparison_df = pd.DataFrame(comparison_data)
    comparison_df = comparison_df.sort_values('total_value', ascending=False)

    return comparison_df
```

### Monitor Specific Holdings
```python
def monitor_holding_across_firms(ticker, top_n=20):
    """Find which firms hold a specific stock"""
    holders = []

    for filing in filings_13f_hr[:top_n]:
        try:
            thirteen_f = ThirteenF(filing)
            if thirteen_f.has_infotable():
                holdings = thirteen_f.infotable
                ticker_holdings = holdings[holdings['Ticker'] == ticker]

                if len(ticker_holdings) > 0:
                    holders.append({
                        'company': filing.company,
                        'cik': filing.cik,
                        'shares': ticker_holdings.iloc[0]['SharesPrnAmount'],
                        'value': ticker_holdings.iloc[0]['Value'],
                        'filing_date': filing.filing_date
                    })
        except Exception as e:
            continue

    return pd.DataFrame(holders).sort_values('value', ascending=False)
```

## Lessons Learned & Future Improvements

### Key Insights from Recent Implementation

**1. Data Integration Challenges**
- **Issue**: When updating JSON data from markdown files, manual parsing was required
- **Solution**: Created automated parsing logic to extract firm data and holdings
- **Action**: Implement automated markdown-to-JSON conversion script

**2. Dynamic UI Scaling**
- **Issue**: Original UI only displayed first 5 firms, but new data had 10 firms
- **Solution**: Updated loop condition from `firmIdx < 5` to `firmIdx < firmData.length`
- **Action**: Make UI components dynamically responsive to data size

**3. Data Structure Evolution**
- **Issue**: New filings had different data formats and additional fields
- **Solution**: Enhanced data validation and normalization
- **Action**: Create data schema validation for consistency

**4. Filing Date Management**
- **Issue**: Hardcoded filing dates caused incorrect display for new firms
- **Problem**: Original code used "Filed: 11/26" for all firms, but new December filings had date "2025-12-02"
- **Solution**: Implemented dynamic filing date retrieval with fallback logic
- **Implementation**:
  - Added `filingDate` field to each firm in JSON data structure
  - Created `getFilingDate(firmIdx)` function to extract and format dates
  - Used dynamic template `${getFilingDate(firmIdx)}` instead of hardcoded value
  - Maintained backward compatibility with fallback to "11/26" for legacy data
- **Action**: Add automated date extraction from markdown metadata during parsing

### Actionable Tasks for Next Implementation

**✅ COMPLETED TASKS:**
- [x] Updated JSON data structure to include new firms
- [x] Modified JavaScript to display all firms dynamically
- [x] Adjusted CSS grid layout for better responsive design
- [x] Added proper firm descriptions and metadata
- [x] Fixed filing date display to show correct dates for each firm
- [x] Implemented dynamic filing date retrieval with fallback logic


**📋 UPCOMING TASKS:**

**1. Automated Data Pipeline with Date Extraction**
```python
# TODO: Create script to auto-update from markdown to JSON with date parsing
def parse_markdown_to_json(markdown_path, json_path):
    """Automatically parse markdown filings into JSON format with proper date handling"""
    # Parse markdown sections using regex patterns
    # Extract firm metadata including:
    #   - Company name
    #   - Filing date (critical for display accuracy)
    #   - Report period
    #   - Total value and holdings
    # Extract holdings data with proper formatting
    # Generate complete JSON structure with all required fields
    # Write to output file with validation
    pass

def extract_filing_date_from_markdown(section_text):
    """Extract and normalize filing dates from markdown metadata"""
    # Use regex to find **Filing Date:** pattern
    # Parse date string and convert to ISO format (YYYY-MM-DD)
    # Handle different date formats consistently
    # Return standardized date for JSON consistency
    pass
```

**2. Enhanced Error Handling**
```javascript
// TODO: Add comprehensive error states for missing data
function validateFirmData(firmData) {
    // Check required fields
    // Handle missing values gracefully
    // Provide fallback UI states
}
```

**3. Performance Optimization**
```javascript
// TODO: Implement virtual scrolling for large holdings lists
function setupVirtualScrolling(container, items) {
    // Use IntersectionObserver for lazy loading
    // Implement pagination for better performance
}
```

**4. Data Validation Layer**
```python
# TODO: Add schema validation for JSON data
def validate_13f_json_schema(data):
    """Validate JSON structure against expected schema"""
    schema = {
        "firms": ["array", "required"],
        "holdings": ["array", "required"],
        # Define expected fields and types
    }
    # Implement validation logic
```

## Change Log

### Version History
- **1.0.0** (2025-12-03): Initial PRD with complete 13F filing procedures
- **1.0.1**: Added error handling best practices
- **1.0.2**: Added performance optimization section
- **1.1.0** (2025-12-03): Added lessons learned and future improvements based on recent implementation

### Future Enhancements
- [ ] Automated email alerts for new filings
- [ ] Integration with portfolio analysis tools
- [ ] Advanced visualization capabilities
- [ ] Machine learning for trend analysis
- [ ] Automated markdown-to-JSON conversion pipeline
- [ ] Real-time data validation and error reporting
- [ ] Performance monitoring dashboard

## Implementation Checklist

**For Next 13F Update:**
- [ ] Run automated parsing script to extract new filings with proper date extraction
- [ ] Validate JSON schema matches expected structure including filingDate fields
- [ ] Test UI rendering with expanded dataset and verify dynamic date display
- [ ] Verify all firm links point to correct markdown anchors
- [ ] Validate filing dates are correctly parsed and formatted (MM/DD format)
- [ ] Test fallback logic for missing filing dates
- [ ] Update documentation with any new data patterns
- [ ] Monitor performance with increased data volume
- [ ] Implement caching for frequently accessed firms
- [ ] Add unit tests for date parsing and formatting functions