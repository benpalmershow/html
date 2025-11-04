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
   - Example citation: “Bureau of Labor Statistics, *Employment Situation Summary, 2024* (Table A-1, p. 5).”

---

## 3. When Data Are Missing or Ambiguous

- If a user requests information that does **not appear in the PDF**, clearly state:
  > “This figure is not listed in the published report. It may exist in public-use data, but it is not cited in the  PDF.”

- Offer to retrieve the value from open datasets **only after confirming the user’s consent** to use external data.

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
- Use direct, factual language. Avoid AI disclaimers or formulaic phrasing (“Key Takeaways,” “In summary”).
- Focus on **verifiable facts** and **document-based sourcing**, not on interpretation unless explicitly requested.
- If inference is necessary, first show the raw data and then state:
  > “Based on the surrounding tables and context, one could infer that…”

---

## 6. Example Workflow

```text
User: Show me the unemployment rate for Q3 2024.

Assistant:
1. Search the document for “unemployment rate Q3 2024.”
2. Identify the relevant table (e.g., Table A-1: Employment status of the civilian noninstitutional population).
3. Verify number: 4.2% unemployment rate.
4. Reply with citation: “According to Table A-1 (page 5) of the Bureau of Labor Statistics 2024 report, the rate was 4.2%.”
5. If not found, ask permission to check raw data.
```

---

## 7. Editorial Safeguards

- Always be skeptical of current narratives and media sources in general.
- Maintain reproducibility: another reader should be able to verify each figure by consulting the cited table.

---

## 8. Quoting Standards

- Use direct quotes only from verified transcripts or official sources; avoid paraphrased or fabricated quotes.
- Clearly label paraphrases as such to distinguish from direct quotations.
- Cite the source for all quotes, including transcript links for full context.

---

## 9. Images and Maps: Embedding Requirements

**CRITICAL: Always embed actual images, never just describe them or write about them.**

### Image Embedding Standards

- **Always use `<img>` tags with actual `src` URLs** — Do not write "Photo: [description]" or "Map available at [link]". Embed the image directly in the article.
- **Use working image URLs** — Prefer stable, reliable sources:
  - **Wikimedia Commons**: Use `Special:FilePath` URLs for guaranteed access: `https://commons.wikimedia.org/wiki/Special:FilePath/Filename.ext`
  - **Direct image URLs**: For broadcaster images, use direct image URLs (e.g., CBS News image URLs from their CDN)
  - **Test URLs**: Ensure images load before including them

### Image Sizing and Layout

- **Single images (event photos, main illustrations)**:
  - Use `style="max-width: 100%; height: auto;"` for responsive full-width images
  - Example: `<img src="[url]" alt="[description]" style="max-width: 100%; height: auto;">`

- **Thumbnail grids (multiple maps, conflict regions, etc.)**:
  - Use fixed square dimensions: `width: 120px; height: 120px;` for thumbnails
  - Use CSS Grid layout for responsive grids: `display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;`
  - Example thumbnail structure:
    ```html
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0;">
      <figure style="margin: 0; text-align: center;">
        <img src="[url]" alt="[description]" style="width: 120px; height: 120px; border: 1px solid #ddd; border-radius: 4px;">
        <figcaption style="font-size: 0.9em; margin-top: 8px;"><strong>Title</strong><br>Description</figcaption>
      </figure>
    </div>
    ```

### Finding Wikimedia Commons Images

- **Search strategy**: Use Wikimedia Commons search for conflict names, location names, or map types
- **Common file patterns**:
  - Location maps: `[Country]_location_map.svg`
  - Conflict maps: `[Conflict_name]_map.png` or `[Conflict_name]_conflict_map.png`
  - Regional maps: `[Region]_orthographic_projection.svg`
- **Always verify the file exists** using the Special:FilePath URL before including

### Image Attribution

- **Wikimedia Commons images**: Include attribution in caption: "via Wikimedia Commons" or "(via Wikimedia Commons)"
- **Broadcaster images**: Credit the source: "Credit: [Broadcaster Name]" or "(CBS News)"
- **Always include alt text** for accessibility: `alt="[descriptive text]"`

### Map-Specific Guidelines

- **Conflict maps**: When article mentions multiple conflicts/regions, create a thumbnail grid with one map per conflict
- **Map sizing**: Use 120px x 120px for thumbnail grids, full-width for single featured maps
- **Map captions**: Include conflict name, region description, and brief context if needed
- **Do not imply outcomes**: Maps are for geographic orientation only; clearly state this in captions or disclaimers

### Common Image Sources

- **Wikimedia Commons** (preferred for maps and historical images):
  - Format: `https://commons.wikimedia.org/wiki/Special:FilePath/[Filename]`
  - Search at: https://commons.wikimedia.org/
  - Verify license allows reuse
```

---

## 10. Interviews and Source Material: Transcription & Image Use


- **Quantitative claims made in interviews**:
  - Do not restate specific numbers unless you also provide the official table release and date. Instead, link readers to the live dashboard or original table.
  - If a number is disputed or time-sensitive, note that verification is pending and provide the authoritative source you will check.

- **Event photos from sources**:
  - **ALWAYS embed the actual image** using `<img>` tags with direct image URLs
  - Use source-provided press images or CDN URLs when available
  - Include proper attribution: "Credit: [Source]" or "(Source Name)"
  - Size appropriately: full-width for event photos, thumbnails for galleries

- **Map/context for interview topics**:
  - **ALWAYS embed maps inline** as thumbnails in a grid layout when multiple regions are discussed
  - Use Wikimedia Commons Special:FilePath URLs for reliable map access
  - Size maps as 120px x 120px thumbnails in grid layouts
  - Provide geographic orientation only; do not use maps to imply conflict status or outcomes

---


