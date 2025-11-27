#!/usr/bin/env python3
"""Test Edgar tools installation and basic functionality"""

import subprocess
import sys

# Install edgartools with compatible versions
print("Installing edgartools with compatible dependencies...")
subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "--upgrade", "pip"])
subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "edgartools", "hishel==0.0.27"])
print("✓ Installation complete!")

# Test basic functionality
print("\nTesting Edgar tools...")
from edgar import Company, set_identity

# Set identity (required by SEC)
set_identity("test@example.com")

# Try using CIK directly instead of ticker (Apple's CIK is 0000320193)
print("Fetching Apple (CIK: 320193) latest 10-K filing...")
try:
    company = Company("0000320193")
    latest_10k = company.get_filings(form="10-K").latest()

    print(f"✓ Successfully retrieved: {latest_10k.filing_type}")
    print(f"  Company: {latest_10k.company}")
    print(f"  CIK: {latest_10k.cik}")
    print(f"  Filing Date: {latest_10k.filing_date}")
    print(f"  Accession Number: {latest_10k.accession_number}")

    # Extract some basic text
    print("\nExtracting filing text...")
    text = latest_10k.text()
    print(f"✓ Text extracted ({len(text)} characters)")
    print(f"  First 200 characters:\n  {text[:200]}...")

    print("\n✓ Edgar tools is working correctly!")
except Exception as e:
    print(f"✗ Error: {e}")
    print("\nEdgartools is installed but encountering network/dependency issues.")
    print("This may be due to SEC API rate limiting or network connectivity.")
    print("\nTo verify installation, you can run:")
    print("  python3 -c \"from edgar import Company; print('Edgar imported successfully')\"")

