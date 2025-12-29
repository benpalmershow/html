# Data Fetching and Citation Standards

This markdown file outlines the editorial and technical standards for sourcing, verifying, and publishing quantitative content across all website articles, emphasizing accuracy and integrity in data presentation.

---

## 1. Data Integrity Principles

- **Use only verifiable data.** All numbers, rates, and trends must come directly from published PDFs or official data tables — not summaries, dashboards, or media articles.
- **No placeholders.** If specific values are unavailable, state this clearly rather than estimating.
- **Transparency first.** If a URL, dataset, or API endpoint is inaccessible, disclose that to the user before inferring or approximating values.
- **Version control.** Always cite the publication year, identifier (e.g., report number), and release date of the source used (e.g., *Economic Indicators, 2024 – Report ID 12345*).
- **Define your source for financial data:** corporate sources, Nasdaq, Pitchbook, etc.
- **n/a required rather than a speculation when data is not available.**

---

## 2. Procedure for Fetching Correct Data

1. **Locate the Source Document:**
- Use official URLs (e.g., government or reputable organization websites) and verify that the document or data is accessible.
- If it cannot be accessed, prompt the user to provide or upload the source directly.

2. **Search Within the Document:**
- Use exact queries like specific terms related to the data (e.g., `unemployment rate` or `inflation percentage`) to identify relevant tables or sections.
- Confirm table titles or section headers match the description (e.g., *Table 3: Quarterly Economic Indicators*).

3. **Extract the Numbers:**
- Record values exactly as they appear (e.g., `4.2% unemployment rate for Q3 2024`).
- Capture both the metric and the associated context, such as timeframe or population.

4. **Cite Precisely:**
   - Include the **source name, table/section number, page number**, and **data description** when referencing a statistic.
   - Example citation: "Bureau of Labor Statistics, *Employment Situation Summary, 2024* (Table A-1, p. 5)."

---

## 3. When Data Are Missing or Ambiguous

- If a user requests information that does **not appear in the PDF**, clearly state:
   > "This figure is not listed in the published report. It may exist in public-use data, but it is not cited in the  PDF."

- Offer to retrieve the value from open datasets **only after confirming the user's consent** to use external data.

---

## 3a. Calculated Percentages and Derived Metrics

**Always show your work for any calculated percentage or derived statistic:**

- When calculating a percentage from raw numbers, include the explicit formula in the article or footnote
- Example: "Noncitizens represented 10.6% of SNAP participants (4.234 million ÷ 40.065 million total participants)"
- Do not round percentages for dramatic effect; show both the raw calculation and rounded result
- If combining figures from multiple tables, verify that the source tables are compatible (same reporting period, same population definition) before aggregating
- Flag any discrepancies between table labels and calculated results

**Cross-referencing multiple tables for completeness:**

When a claim provides a numerator but not the denominator (e.g., "68,000 noncitizens" with an estimated "5 percent"), **you must locate the complete dataset to verify**:
- Search official reports for the state/national total population
- Confirm the reporting period matches (FY 2023, not FY 2022)
- Verify population definitions are consistent across sources (e.g., "SNAP participants" vs "SNAP households")
- Calculate the actual percentage and flag if it differs from the provided estimate
- Example: When given "68,000 noncitizens, approximately 5%," search for Massachusetts total SNAP participants, find 803,547 in FY 2023 State Activity Report (Table 27), calculate true percentage as 8.46%, and cite both source documents

**Verification checklist before publishing:**
- [ ] Raw numbers match source table exactly (including units: thousands, millions, etc.)
- [ ] Calculation is transparent and reproducible  
- [ ] Rounding is clearly stated if applied
- [ ] Combined figures (when summing across categories) match the reported total or note any discrepancy
- [ ] All percentages derived from division have both numerator and denominator shown explicitly
- [ ] When cross-referencing tables, confirm all data are from the same fiscal year and population definition
- [ ] If provided estimate differs from calculated percentage, both figures are disclosed with sources

---

## 4. Cite Precisely

- Include the **source name, table/section number, page number**, and **data description** when referencing a statistic.
- Example citation: "Bureau of Labor Statistics, *Employment Situation Summary, 2024* (Table A-1, p. 5)."
- For SEC filings and other HTML documents: Cite the filing date, section name, and paragraph or table reference if pages are not numbered (e.g., "Navan S-1/A Filing, October 10, 2025, Prospectus Summary, Offering Structure table").

## 5. Tone and Communication

- No checkmarks (✅/❌).
- No "Key Highlights" boxes.
- No "Key Takeaways" sections.
- No AI embellishments or tall tales of AI.
- When clear patterns are apparent, use graphs and charts.
- Tell a story where a trend exists. Don't be superflous so if something is not interesting, leave it out.
- Be consise and don't add language just to fill a page. Be interesting, poignant.
- Use storyful approach with compelling narrative that hooks and keeps reader engaged.
- Use direct, factual language. Avoid AI disclaimers or formulaic phrasing ("Key Takeaways," "In summary").
- Focus on **verifiable facts** and **document-based sourcing**, not on interpretation unless explicitly requested.
- If inference is necessary, first show the raw data and then state:
   > "Based on the surrounding tables and context, one could infer that…"

---

## 6. Example Workflow

```text
User: Show me the unemployment rate for Q3 2024.
