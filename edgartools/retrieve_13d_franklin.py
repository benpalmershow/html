#!/usr/bin/env python3
"""Retrieve latest SC 13D/A filing from Franklin Resources Inc using direct SEC API"""

import requests
import json
from datetime import datetime

print("Retrieving latest SC 13D/A filing from Franklin Resources Inc using direct SEC API...")

# Franklin Resources Inc CIK
cik = "0000038777"

try:
    # Direct SEC API call for submissions
    url = f"https://data.sec.gov/submissions/CIK{cik}.json"
    headers = {'User-Agent': 'Educational Research benp8400@gmail.com'}

    response = requests.get(url, headers=headers, timeout=10)
    response.raise_for_status()
    data = response.json()

    print(f"Company: {data.get('name', 'Unknown')}")
    print(f"CIK: {cik}")

    # Get filings
    filings = data.get('filings', {}).get('recent', {})

    # Filter for 13D related forms
    form_types = filings.get('form', [])
    filing_dates = filings.get('filingDate', [])
    accession_numbers = filings.get('accessionNumber', [])
    primary_documents = filings.get('primaryDocument', [])

    # Combine into list of dicts
    all_filings = []
    for i in range(len(form_types)):
        form = form_types[i]
        if '13D' in form:  # Include SC 13D, SC 13D/A, 13D, 13D/A
            all_filings.append({
                'form': form,
                'filing_date': filing_dates[i],
                'accession_number': accession_numbers[i],
                'primary_document': primary_documents[i] if i < len(primary_documents) else ''
            })

    # Sort by filing date (most recent first)
    all_filings.sort(key=lambda x: x['filing_date'], reverse=True)

    print(f"\nFound {len(all_filings)} SC 13D/SC 13D/A filings:")
    for i, f in enumerate(all_filings[:5]):  # Show first 5 (most recent)
        print(f"  {i+1}. {f['form']} - {f['filing_date']} - {f['accession_number']}")

    # Get the latest filing
    latest_13d = all_filings[0] if all_filings else None
    if latest_13d:
        print(f"\nLatest SC 13D/A filing: {latest_13d['filing_date']}")
        print(f"Form: {latest_13d['form']}")
        print(f"Accession: {latest_13d['accession_number']}")

        # Download filing text directly from SEC
        accession = latest_13d['accession_number']
        primary_doc = latest_13d.get('primary_document', 'd13da.htm')  # Default for SC 13D/A
        if not primary_doc:
            primary_doc = 'd13da.htm'
        text_url = f"https://www.sec.gov/Archives/edgar/data/{cik}/{accession.replace('-', '')}/{primary_doc}"

        print("\nExtracting filing text...")
        text_response = requests.get(text_url, headers=headers, timeout=10)
        text_response.raise_for_status()
        filing_text = text_response.text
        print(f"Text extracted ({len(filing_text)} characters)")

        # Create markdown content
        md_content = f"""# Franklin Resources Inc {latest_13d['form']} Filing

**Company:** {data.get('name', 'Unknown')}
**CIK:** {cik}
**Filing Date:** {latest_13d['filing_date']}
**Form:** {latest_13d['form']}
**Accession Number:** {latest_13d['accession_number']}

## Filing Text Excerpt

{filing_text[:2000]}...

[View full filing on SEC EDGAR](https://www.sec.gov/Archives/edgar/data/{cik}/{accession.replace('-', '')}/{accession}-index.html)
"""

        # Write to markdown file
        filename = 'franklin_13d.md'
        with open(filename, 'w') as f:
            f.write(md_content)

        print(f"\nMarkdown file '{filename}' created successfully!")
        print(f"Filing date: {latest_13d['filing_date']}")
        print(f"Accession: {latest_13d['accession_number']}")
    else:
        print("No SC 13D or SC 13D/A filings found")

except Exception as e:
    print(f"Error: {str(e)[:300]}")
    print("\nNote: SC 13D/A filings report beneficial ownership of more than 5% of securities.")