#!/usr/bin/env python3
"""Retrieve all latest 13F filings from this week with holdings and percentages"""

from edgar import *
from datetime import datetime, timedelta

# Set identity (required by SEC)
set_identity("benp8400@gmail.com")

print("Retrieving all 13F filings from this week...")

# Get filings from the past week
all_week_filings = []
for days_back in range(7):  # Last 7 days
    date_str = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")
    try:
        day_filings = get_filings(form="13F-HR", filing_date=date_str)
        all_week_filings.extend(list(day_filings))
    except:
        continue

try:
    print(f"Found {len(all_week_filings)} 13F filings this week:")
    for i, f in enumerate(all_week_filings[:10]):  # Show first 10
        print(f"  {i+1}. {f.company} - {f.form} - {f.filing_date} - {f.accession_number}")

    # Process each filing
    md_content = "# Latest 13F Filings This Week\n\n"

    processed_count = 0
    for filing in all_week_filings[:5]:  # Limit to first 5 to avoid too much data
        try:
            print(f"\nProcessing {filing.company} ({filing.filing_date})...")
            filing_obj = filing.obj()
            holdings_df = filing_obj.infotable

            # Aggregate holdings by issuer name
            holdings = {}
            for _, holding in holdings_df.iterrows():
                name = holding.get('Issuer', holding.get('Name', 'Unknown'))
                value = holding.get('Value', holding.get('value', 0))
                if isinstance(value, str):
                    value = float(value.replace(',', '').replace('$', ''))
                holdings[name] = holdings.get(name, 0) + value

            # Sort by value
            holdings = dict(sorted(holdings.items(), key=lambda x: x[1], reverse=True))
            total_value = float(filing_obj.total_value)

            # Add to markdown
            md_content += f"## {filing.company}\n\n"
            md_content += f"**Report Period:** {filing_obj.report_period}\n"
            md_content += f"**Filing Date:** {filing_obj.filing_date}\n"
            md_content += f"**Total Value:** ${total_value:,.0f}\n\n"

            md_content += "| Rank | Holding | Value | % of Portfolio |\n"
            md_content += "|------|---------|-------|---------------|\n"

            for i, (name, value) in enumerate(list(holdings.items())[:10], 1):  # Top 10 holdings
                percentage = (value / total_value) * 100
                md_content += f"| {i} | {name[:40]} | ${value:,.0f} | {percentage:.1f}% |\n"

            md_content += "\n---\n\n"
            processed_count += 1

        except Exception as e:
            print(f"Error processing {filing.company}: {str(e)[:100]}")
            continue

    # Write to markdown file
    filename = 'latest_13f_filings_week.md'
    with open(filename, 'w') as f:
        f.write(md_content)

    print(f"\nProcessed {processed_count} filings successfully!")
    print(f"Markdown file '{filename}' created with latest 13F holdings and percentages.")

except Exception as e:
    print(f"Error: {str(e)[:300]}")
    print("\nNote: 13F filings contain institutional investment holdings.")