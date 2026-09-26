# SCOTUS Oral Arguments Analysis - PRD

## Product Overview
A comprehensive tracking and analysis system for Supreme Court oral arguments, capturing quantitative metrics, qualitative insights, and notable moments from oral proceedings.

## Core Data Sections

### 1. Time Spoken Per Justice
**Purpose:** Track speaking patterns and engagement levels across justices

**Metrics to Capture:**
- Total speaking time per justice
- Number of speaking instances/interruptions
- Average length of questions
- Speaking order/timing during argument
- Speaking frequency distribution

**Data Format:**
- Start timestamp
- End timestamp
- Duration (calculated)
- Justice name
- Type of statement (question, statement, clarification)

---

### 2. Amendments Incurred
**Purpose:** Document Constitutional amendments referenced and their relevance

**Metrics to Capture:**
- Amendment number and text
- Justice(s) who referenced it
- Context of reference
- Relevance to central issue
- Number of references per amendment

**Data Format:**
- Amendment designation (e.g., "1st Amendment", "14th Amendment")
- Full text reference
- Citation source
- Frequency count

---

### 3. Position Per Justice
**Purpose:** Track each justice's apparent stance on the case

**Metrics to Capture:**
- Inferred position (for/against plaintiff/defendant, etc.)
- Confidence level in position assessment
- Key questions that revealed position
- Consistency throughout argument
- Notable shifts or ambiguities

**Data Format:**
- Justice name
- Stated or inferred position
- Supporting evidence/quotes
- Opposing counterpoints raised
- Confidence score

---

### 4. Precedents
**Purpose:** Track Supreme Court and other precedents cited

**Metrics to Capture:**
- Case name and year
- Precedent type (direct, distinguishable, supporting, etc.)
- Relevance to current case
- Justice(s) who cited it
- How it was used in argument

**Data Format:**
- Case name
- Citation
- Year decided
- Court level
- Holding/principle
- Context of reference

---

### 5. Hypotheticals Brought Up
**Purpose:** Document hypothetical scenarios posed by justices

**Metrics to Capture:**
- Hypothetical scenario description
- Justice who posed it
- Relevance to case issues
- Attorney response
- Implications tested

**Data Format:**
- Hypothetical description
- Justice name
- Party responding
- Response summary
- Key takeaway/implication

---

### 6. Funny Statements
**Purpose:** Capture memorable, humorous, or notable quips and statements

**Metrics to Capture:**
- Statement text
- Justice or attorney who made it
- Context/what prompted it
- Apparent intent (humor, sarcasm, criticism, etc.)
- Impact/reaction

**Data Format:**
- Exact quote
- Speaker name and role
- Timestamp
- Category (humor, sarcasm, criticism, etc.)
- Context notes

---

### 7. Issues at Hand
**Purpose:** Define and track core issues being litigated

**Metrics to Capture:**
- Primary issue
- Secondary issues
- Constitutional questions
- Statutory interpretation questions
- Practical implications
- Potential rule changes

**Data Format:**
- Issue statement
- Category (constitutional, statutory, procedural, etc.)
- Parties' opposing positions
- Key questions to be answered
- Stakes/implications

---

### 8. Resources
**Purpose:** Compile authoritative links and reference materials for each case

**Standard Resources to Include:**
- Supreme Court Docket (official case page)
- Oral Argument Transcript (PDF)
- Oral Argument Audio (MP3 from supremecourt.gov)
- Oral Argument Podcast (Apple Podcasts - Supreme Court Official Podcast)
- SCOTUS Blog Analysis and coverage
- Lower court opinion(s)
- Briefs on the merits (petitioner and respondent)
- Amicus briefs (key filings)

**Data Format:**
- Resource title
- URL
- Icon/type identifier
- Availability status

---

## Data Collection Standards

### Format Requirements
- All timestamps in MM:SS format (relative to audio start)
- Quotes in quotation marks with speaker attribution
- Citations in standard legal format
- Confidence levels for inferred data (1-5 scale)

### Coverage
- Full oral argument proceedings
- Both sides (petitioner and respondent)
- All justice interactions

### Quality Standards
- Accuracy verified against official transcripts
- No interpretation bias in factual data
- Clear distinction between facts and analysis
- Complete coverage of proceedings
- Verify transcript URLs against Supreme Court official source (multiple versions may exist with different identifiers; check docket page for correct identifier)
- Verify podcast episode IDs on Apple Podcasts Supreme Court Official Podcast feed
- Test all resource links before publishing

### Resource Link Guidelines
- **Transcript PDF:** Navigate to official docket page, locate correct transcript identifier (often appended as _xxxx.pdf)
- **Podcast URL:** Format: `https://podcasts.apple.com/us/podcast/oral-arguments-for-the-supreme-court-of-the-united-states/id1187748137?i={episodeID}`
  - Episode IDs vary by case; verify on Apple Podcasts
- **Ensure consistent ordering:** Docket → Transcript → Audio MP3 → Podcast → Analysis/Commentary
- **Update both:** Markdown article frontmatter AND json/articles.json must include same resources for consistency

---

## Output Formats

### Structured Data
- JSON for programmatic access
- CSV for analysis and sorting
- Markdown summaries for readability

### Analysis Views
- Justice speaking time dashboard
- Position alignment matrix
- Precedent frequency analysis
- Issue mapping diagram

---

## Success Metrics
- Completeness: 100% coverage of oral argument
- Accuracy: Matches official SCOTUS transcript
- Usefulness: Enables comparative analysis across cases
- Accessibility: Multiple output formats available
