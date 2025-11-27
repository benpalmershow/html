#!/usr/bin/env python3
"""Direct SEC EDGAR API access - bypasses edgartools caching issues"""

import requests
import json
from typing import Dict, List

class SECAPIClient:
    """Direct SEC EDGAR API client"""
    BASE_URL = "https://data.sec.gov/api/xbrl"
    COMPANY_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json"
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Educational Research)'
        })
    
    def get_company_tickers(self) -> Dict[str, dict]:
        """Fetch all company CIKs and tickers"""
        try:
            response = self.session.get(self.COMPANY_TICKERS_URL, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error fetching tickers: {e}")
            return {}
    
    def get_company_facts(self, cik: int) -> Dict:
        """Get company facts (financials) by CIK"""
        try:
            url = f"https://data.sec.gov/submissions/CIK{cik:010d}.json"
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error fetching company facts for CIK {cik}: {e}")
            return {}

# Example usage
if __name__ == "__main__":
    client = SECAPIClient()
    
    print("Fetching company tickers from SEC...")
    tickers = client.get_company_tickers()
    
    if tickers:
        print(f"✓ Successfully fetched {len(tickers)} companies")
        print("\nSample companies:")
        for i, (idx, company) in enumerate(list(tickers.items())[:5]):
            print(f"  {company.get('title', 'N/A')} ({company.get('ticker', 'N/A')})")
    else:
        print("✗ Failed to fetch tickers")
    
    print("\n" + "="*60)
    print("Fetching Apple (AAPL) facts...")
    apple_facts = client.get_company_facts(320193)  # Apple's CIK
    
    if apple_facts:
        print(f"✓ Successfully fetched data")
        if 'entityType' in apple_facts:
            print(f"  Entity Type: {apple_facts['entityType']}")
        if 'facts' in apple_facts:
            print(f"  Number of fact categories: {len(apple_facts['facts'])}")
    else:
        print("✗ Failed to fetch Apple data")
