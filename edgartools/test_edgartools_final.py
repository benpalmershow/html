#!/usr/bin/env python3
"""Test edgartools with proper setup"""

from edgar import *

# Set identity (required by SEC)
set_identity("benp8400@gmail.com")

print("Testing edgartools...")

# Try to get Apple company info
try:
    company = Company("0000320193")  # Apple's CIK
    print(f"✓ Company loaded: {company.name}")
    print(f"  CIK: {company.cik}")
    
    # Try to get latest 10-K
    print("\nFetching latest 10-K filing...")
    filings = company.get_filings(form="10-K")
    latest = filings.latest()
    print(f"✓ Latest 10-K found")
    print(f"  Filing date: {latest.filing_date}")
    print(f"  Accession: {latest.accession_number}")
    
except Exception as e:
    print(f"✗ Error: {str(e)[:200]}")
    print("\nEdgartools is installed but may have API issues.")
    print("SEC EDGAR API might be rate limiting or temporarily unavailable.")
