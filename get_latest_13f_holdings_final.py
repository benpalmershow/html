#!/usr/bin/env python3

# Script to get latest 13F-HR filings with holdings using edgartools
from edgar import *
import pandas as pd

# Set identity as required by SEC regulations
set_identity("benp8400@gmail.com")

print("🔍 Fetching latest 13F-HR filings...")

# Get filings and filter for 13F-HR
filings = get_filings()
filings_13f_hr = filings.filter(form='13F-HR')

print(f"📊 Found {len(filings_13f_hr)} 13F-HR filings")

print("\n📋 Latest 13F-HR Filings with Holdings:")
print("=" * 80)

# Get the 5 most recent filings by iterating through the collection
count = 0
for filing in filings_13f_hr:
    if count >= 5:  # Limit to 5 filings
        break

    print(f"\n{count+1}. {filing.company} (CIK: {filing.cik})")
    print(f"   📅 Filed: {filing.filing_date}")
    print(f"   🔢 Accession: {filing.accession_no}")

    try:
        # Create ThirteenF object from the filing
        thirteen_f = ThirteenF(filing)

        print(f"   💰 Total Holdings: {thirteen_f.total_holdings}")
        print(f"   💰 Total Value: ${thirteen_f.total_value:,.0f}")
        print(f"   📅 Report Period: {thirteen_f.report_period}")

        # Try to get the infotable (holdings data)
        if thirteen_f.has_infotable():
            infotable = thirteen_f.infotable
            if infotable is not None and len(infotable) > 0:
                print(f"   📊 Holdings Data: {len(infotable)} positions")
                print(f"   🔝 Top 3 Holdings:")
                # Show top 3 holdings
                top_holdings = infotable.head(3)
                for idx, holding in top_holdings.iterrows():
                    issuer = holding['Issuer']
                    ticker = holding['Ticker'] if pd.notna(holding['Ticker']) else 'N/A'
                    value = holding['Value']
                    shares = holding['SharesPrnAmount']
                    share_type = holding['Type'] if pd.notna(holding['Type']) else 'Shares'
                    print(f"      {idx+1}. {issuer} ({ticker})")
                    print(f"         ${value:,.0f} - {shares:,.0f} {share_type}")
            else:
                print(f"   📊 No holdings data in infotable")
        else:
            print(f"   ℹ️  No infotable available for this filing")

    except Exception as e:
        print(f"   ⚠️  Could not retrieve holdings: {str(e)}")

    print("-" * 80)
    count += 1

print(f"\n✅ Successfully retrieved and analyzed {count} most recent 13F-HR filings with holdings")
print(f"   Total 13F-HR filings available: {len(filings_13f_hr)}")