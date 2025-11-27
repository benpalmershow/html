#!/usr/bin/env python3
"""Retrieve latest 13F filing and list holdings by percentage"""

from edgar import *

# Set identity (required by SEC)
set_identity("benp8400@gmail.com")

print("Retrieving latest 13F filing...")

# Use Berkshire Hathaway as example (they file 13F)
cik = "0001067983"

try:
    company = Company(cik)
    print(f"Company: {company.name}")
    print(f"CIK: {company.cik}")

    # Get 13F filings
    filings = company.get_filings(form="13F-HR")
    all_filings = list(filings)  # Convert to list to access by index

    print(f"\nFound {len(all_filings)} 13F filings:")
    for i, f in enumerate(all_filings[:5]):  # Show first 5
        print(f"  {i+1}. {f.form} - {f.filing_date} - {f.accession_number}")

    # Find the most recent 13F-HR that is not the latest
    previous_13f_filing = None
    for filing in all_filings[1:]:  # Skip the latest
        if filing.form == "13F-HR":
            previous_13f_filing = filing
            break

    if previous_13f_filing:
        print(f"\nUsing PREVIOUS 13F-HR filing: {previous_13f_filing.filing_date}")
        print(f"Form: {previous_13f_filing.form}")
        print(f"Accession: {previous_13f_filing.accession_number}")
        previous_13f = previous_13f_filing.obj()
    else:
        print(f"\nNo previous 13F-HR filing found")
        previous_13f = None

    # Show latest for reference
    latest_13f = filings.latest()
    print(f"Latest 13F filing: {latest_13f.filing_date} (not using this one)")

    # Get both current and previous 13F data
    current_13f = latest_13f.obj()
    current_holdings_df = current_13f.infotable

    prev_holdings = {}
    if previous_13f:
        prev_holdings_df = previous_13f.infotable
        for _, holding in prev_holdings_df.iterrows():
            name = holding.get('Issuer', holding.get('Name', 'Unknown'))
            value = holding.get('Value', holding.get('value', 0))
            if isinstance(value, str):
                value = float(value.replace(',', '').replace('$', ''))
            prev_holdings[name] = prev_holdings.get(name, 0) + value

    print(f"\nCurrent 13F: {current_13f.report_period} (${float(current_13f.total_value):,.0f})")
    if previous_13f:
        print(f"Previous 13F: {previous_13f.report_period} (${float(previous_13f.total_value):,.0f})")
    else:
        print("No previous 13F available for comparison")
        previous_13f = None

    # Aggregate current holdings by issuer name
    current_holdings = {}
    for _, holding in current_holdings_df.iterrows():
        name = holding.get('Issuer', holding.get('Name', 'Unknown'))
        value = holding.get('Value', holding.get('value', 0))
        if isinstance(value, str):
            value = float(value.replace(',', '').replace('$', ''))
        current_holdings[name] = current_holdings.get(name, 0) + value

    # Sort by total value
    current_holdings = dict(sorted(current_holdings.items(), key=lambda x: x[1], reverse=True))

    # Create combined holdings dict with both current and previous
    all_holdings = set(current_holdings.keys())
    if prev_holdings:
        all_holdings.update(prev_holdings.keys())

    # Create list of holdings with current, previous, and change
    holdings_comparison = []
    for name in all_holdings:
        current_val = current_holdings.get(name, 0)
        prev_val = prev_holdings.get(name, 0) if prev_holdings else 0

        if prev_val > 0:
            change_pct = ((current_val - prev_val) / prev_val) * 100
        else:
            change_pct = None  # New holding

        holdings_comparison.append({
            'name': name,
            'current': current_val,
            'previous': prev_val,
            'change_pct': change_pct
        })

    # Sort by current value (descending)
    holdings_comparison.sort(key=lambda x: x['current'], reverse=True)

    # Create markdown content
    md_content = f"""# Berkshire Hathaway 13F Holdings Comparison

**Current Report Period:** {current_13f.report_period}
**Current Filing Date:** {current_13f.filing_date}
**Current Total Value:** ${float(current_13f.total_value):,.0f}

"""

    if previous_13f:
        md_content += f"""**Previous Report Period:** {previous_13f.report_period}
**Previous Filing Date:** {previous_13f.filing_date}
**Previous Total Value:** ${float(previous_13f.total_value):,.0f}

**Portfolio Change:** {((float(current_13f.total_value) - float(previous_13f.total_value)) / float(previous_13f.total_value) * 100):+.1f}%

"""

    md_content += """| Rank | Holding | Current Value | Prev Value | Change |
|------|---------|---------------|------------|--------|
"""

    for i, holding in enumerate(holdings_comparison[:20], 1):
        name = holding['name']
        current_val = holding['current']
        prev_val = holding['previous']
        change_pct = holding['change_pct']

        current_str = f"${current_val:,.0f}" if current_val > 0 else "-"
        prev_str = f"${prev_val:,.0f}" if prev_val > 0 else "-"

        if change_pct is not None:
            change_str = f"{change_pct:+.1f}%" if change_pct != 0 else "0.0%"
        else:
            change_str = "New"

        md_content += f"| {i:2d} | {name[:35]:<35} | {current_str:>13} | {prev_str:>10} | {change_str:>6} |\n"

    # Write to markdown file
    filename = 'berkshire_13f_comparison.md'
    with open(filename, 'w') as f:
        f.write(md_content)

    print(f"Markdown file '{filename}' created successfully!")
    print(f"Current portfolio value: ${float(current_13f.total_value):,.0f}")
    if previous_13f:
        portfolio_change = ((float(current_13f.total_value) - float(previous_13f.total_value)) / float(previous_13f.total_value)) * 100
        print(f"Portfolio change: {portfolio_change:+.1f}%")
    print(f"Top holding: {list(current_holdings.keys())[0]} (${list(current_holdings.values())[0]:,.0f})")

except Exception as e:
    print(f"Error: {str(e)[:300]}")
    print("\nNote: Not all companies file 13F forms. 13F is for institutional investment managers.")