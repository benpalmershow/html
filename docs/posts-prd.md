# Posts Product Requirements Document (PRD)

## Overview

The Posts system is a core component of the TBPS website, serving as a chronological feed of updates, insights, and content additions across various categories including financial data, news, media recommendations, and journal entries. Posts provide real-time updates to users about new content and key developments.

## Objectives

- Maintain a consistent, professional presentation of information
- Enable easy navigation to relevant sections of the site
- Provide value through timely, accurate, and engaging content
- Ensure accessibility and mobile-friendly formatting

## Post Structure

Each post is a JSON object in `json/posts.json` with the following required fields:

```json
{
  "date": "MM/DD/YY",
  "content": "HTML-formatted string"
}
```

### Date Format
- Use format: MM/DD/YY (e.g., "10/29/25" for October 29, 2025)
- Dates should be in chronological order (newest first)
- Use future dates for scheduled content

### Content Format
- HTML string supporting basic tags: `<b>`, `<br>`, `<a>`, `<i>`, `<img>`, `<ul>`, `<li>`
- Icons via Lucide icons: `<i data-lucide='icon-name' class='post-icon'></i>`
- Images: Use cover images from media.json for media posts, styled with width/height and float for layout; music images styled as circular spinning records (border-radius: 50%, animation: spin)
- Stock tickers: Link to Yahoo Finance pages (e.g., https://finance.yahoo.com/quote/TICKER) with target="_blank" and rel="noopener"
- Links should use relative paths and include `target="_blank"` for external links

## Content Formatting Guidelines

### Structure
- **Title/Icon**: Start with an icon and bold title
- **Body**: Main content with line breaks (`<br><br>`) for spacing
- **Links**: End with relevant navigation links
- **Multiple Sections**: Use line breaks to separate distinct topics within one post

### Typography
- Use `<b>` for emphasis and titles
- Use bullet points (`•`) for lists instead of `<ul>`
- Keep descriptions concise (2-3 sentences max)
- Avoid excessive formatting or emojis

### Icons
- Always include a relevant Lucide icon at the start
- Use `class='post-icon'` for consistent styling
- Common icons:
  - `bar-chart-3`: Financial data
  - `newspaper`: News
  - `film`: Movies/media
  - `book`: Books
  - `music`: Music
  - `football`: Sports
  - `trending-up/trending-down`: Economic indicators
  - `cpu`: Technology/AI
  - `gavel`: Legal news
  - `home`: Housing/real estate
  - `dollar-sign`: Money/economics

## Categories

Posts should fit into one or more categories:

### Financial
- Economic indicators (CPI, PMI, employment, etc.)
- Market data and predictions
- Budget and debt updates

### News
- IPOs and corporate news
- Policy and legal developments
- Industry trends

### Media
- Book recommendations
- Movie/TV reviews
- Music additions

### Journal
- Personal insights and updates
- Site announcements

### Sports
- NFL odds and predictions
- Game updates

## Links and Navigation

### Internal Links
- Use relative paths (e.g., `financials.html`, `news.html`)
- For media items, link to specific cards using anchors (e.g., `media.html#holy-spider`)
- For media sections, use filter parameters (e.g., `media.html?filter=movie` for movies)
- For news articles, use article parameters (e.g., `news.html?article=fomc-may-meeting`)
- For journal entries, use title-based anchors (e.g., `journal.html#prognostication-masturbation`)
- Include descriptive anchor text
- Add filters when appropriate (e.g., `?filter=Consumer%20Indicators`)
- Make images clickable by wrapping in `<a>` tags when linking to media cards

### External Links
- Use `target="_blank"` and `rel="noopener"` for security
- Prefer official sources (government sites, company filings)
- Include context about what the link contains

## Post Improvement Checklist

When improving a post, follow this checklist:

1. **Identify Post Type**: Determine category (Financial, News, Media, Journal, Announcement)
2. **Add Icon**: Select appropriate Lucide icon from the guidelines
3. **Create Title**: Craft a clear, bold title (e.g., <b>Title Here</b>)
4. **Write Description**: Provide concise, informative description (2-3 sentences max)
5. **Link Stock Tickers**: If present, link to Yahoo Finance with target="_blank" and rel="noopener"
6. **Add Images**: For media posts, include cover images with circular styling and float layout
7. **Create Anchors**: Link to specific content using appropriate anchor format:
   - Media: media.html#slug
   - News: news.html?article=slug
   - Journal: journal.html#slug
8. **Separate Topics**: If post covers multiple topics, use separate sections with individual icons/titles
9. **Remove Emojis**: Eliminate informal emojis for professional appearance
10. **Test Links**: Ensure all links work and point to correct locations

## Best Practices

### Content Quality
- Ensure accuracy of data and facts
- Provide context for indicators and trends
- Use active voice and clear language
- Keep posts focused on 1-2 main topics

### Consistency
- Follow established formatting patterns
- Use standard terminology
- Maintain chronological order
- Test links before publishing

### Engagement
- Include calls-to-action (e.g., "View all indicators")
- Highlight key takeaways
- Connect to related content across sections

### Maintenance
- Review and update outdated posts
- Archive old posts if needed
- Maintain data accuracy over time

## Examples

### Financial Indicator Post
```
<i data-lucide='trending-up' class='post-icon'></i> <b>Consumer Confidence Declines in October</b><br><br>• <b>October Index</b>: 94.6 (down from 95.6 in September)<br>• <b>Monthly Change</b>: -1.0 pts<br>• <b>Context</b>: The Conference Board's Consumer Confidence Index declined further below 100, signaling persistent caution among consumers about economic conditions.<br><br>Source: The Conference Board, *Consumer Confidence Survey, October 2025*.<br><br><a href="financials.html?filter=Consumer%20Indicators"><b>View all consumer indicators</b></a>
```

### Media Addition Post
```
<i data-lucide='film' class='post-icon'></i> <a href="media.html#holy-spider"><img src="https://upload.wikimedia.org/wikipedia/en/1/1c/Holy_Spider.jpg" alt="Holy Spider" style="width: 60px; height: auto; float: left; margin-right: 10px;"></a> <b>Holy Spider</b><br><br>A female journalist investigates a serial killer targeting sex workers in Iran, who is hailed as a hero by many. Based on the true story of Saeed Hanaei, this crime thriller exposes the dangers of vigilante justice in a theocratic society.<br><br><a href="media.html#holy-spider"><b>View in Media</b></a>
```

### Music Addition Post
```
<i data-lucide='music' class='post-icon'></i> <a href="media.html#a-fathers-song"><img src="https://i.ytimg.com/vi/Tgvjv5yIr9o/maxresdefault.jpg" alt="A Father's Song" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; float: left; margin-right: 10px; animation: spin 3s linear infinite;"></a> <b>A Father's Song by Allen Stone</b><br><br>A touching ballad about fatherhood and family bonds.<br><br><a href="media.html#a-fathers-song"><b>Listen Now</b></a>
```

### Feature Update Post
```
<i data-lucide='star' class='post-icon'></i> <b>New Feature: Movie Ratings</b><br><br>Rotten Tomatoes and IMDb scores now displayed for all movies on the media page.<br><br><a href="media.html?filter=movie"><b>Browse Movies</b></a>
```

### Journal Post
```
<i data-lucide='trending-up' class='post-icon'></i> <b>New Position: IVES</b><br><br>Added <a href="https://finance.yahoo.com/quote/IVES" target="_blank" rel="noopener">IVES</a> to portfolio.<br><br><i data-lucide='brain' class='post-icon'></i> <b>CPI Estimation Thoughts</b><br><br>Maybe it's time for alternative methods to estimate CPI - AI > human enumerators.<br><br><a href="journal.html#prognostication-masturbation"><b>View in Journal</b></a>
```

(Note: Journal links use title-based anchors generated from entry titles by removing special characters, converting spaces to hyphens, and lowercasing)

### Announcement Post
```
<i data-lucide='dollar-sign' class='post-icon'></i> <b>Circle IPO and Latest TBPS</b><br><br>Circle goes public tomorrow with S-1 summary available in the IPO section.<br><br><a href="news.html?article=circle-ipo"><b>View IPO Details</b></a><br><br>Latest TBPS podcast now available.<br><br><a href="media.html#bribing-kids-to-stay-off-of-socials-pricey-disney-concerning-job-reports-new-movies-protectionist-policy-in-us"><img src="https://i.scdn.co/image/ab67656300005f1f43cdff5b4695d3c9cd9400c7" alt="TBPS Podcast" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; float: left; margin-right: 10px;"></a> <a href="media.html#bribing-kids-to-stay-off-of-socials-pricey-disney-concerning-job-reports-new-movies-protectionist-policy-in-us"><b>Listen to TBPS</b></a>
```

### Multi-Topic Post
```
<i data-lucide='bar-chart-3' class='post-icon'></i> <b>Financial Data Updates</b><br><br><b>Notable MoM Changes:</b><br>• New Home Sales: August +136,000 (+20.5%)<br>• Jobless Claims: September +8,000 (+3.5%)<br>• Southern Border Encounters: September +1,916 (+19.7%)<br><br><a href="financials.html"><b>View all indicators</b></a>
```

## Implementation Notes

- Posts are loaded dynamically by the site's JavaScript
- Icons are rendered using Lucide React
- Journal entries are assigned IDs based on title slugification for anchoring
- Ensure HTML is valid and properly escaped in JSON
- Test rendering on both desktop and mobile views
- Validate all links before deployment

## Updates and Changes

### 5/15/25 Post Improvement
- **Original**: Basic text with long description
- **Updated**: Added film icon, bold title, condensed description to 2 sentences, standardized link format
- **Prompt**: "lets go one post at a time. each post needs improvement. lets start with 5/15"
- **Change**: Transformed informal media addition into structured post matching PRD guidelines

### 5/15/25 Cover Image Addition
- **Original**: Text-only post
- **Updated**: Added cover image from media.json with inline styling (60px width, floated left)
- **Prompt**: "use cover image from @json/media.json and add to post/card"
- **Change**: Enhanced visual appeal by including media cover images directly in posts for better user engagement

### 5/15/25 Anchor Linking
- **Original**: Links pointed to top of media.html
- **Updated**: Links and image now point to specific media card using #anchor (e.g., #holy-spider)
- **Prompt**: "the view in media link and clicking on the cover image should point to position on the @media.html where the media is located"
- **Change**: Improved navigation by linking directly to specific media items, enhancing user experience

### 5/24/25 Music Post Formatting
- **Original**: Informal text with emoji "Allen Stone 🎤 in listen section."
- **Updated**: Added music icon, clickable cover image from media.json, bold title, concise description, and anchor link to #a-fathers-song
- **Prompt**: "lets do same for 5/24"
- **Change**: Standardized music post format to match media post improvements, enhancing visual consistency and navigation

### Music Image Styling
- **Updated**: Music post images styled as circular records with spinning animation (border-radius: 50%, object-fit: cover, animation: spin 3s linear infinite)
- **Prompt**: "can you make music related images look like records (round, spinning)"
- **Change**: Added distinctive visual styling for music posts to create engaging, thematic presentation

### 5/25/25 Feature Update Formatting
- **Original**: Informal text "Rotten Tomatoes and IMDb ratings added to watch section."
- **Updated**: Added star icon, bold title "New Feature: Movie Ratings", expanded description, and consistent link format with filter parameter
- **Prompt**: "now do 5/25"
- **Change**: Standardized feature update posts to match the improved formatting style and updated references to unified media page

### URL Filter Support
- **Added**: URL parameter support for media page filters (e.g., ?filter=movie pre-selects movie filter)
- **Prompt**: "there is no Watch section. its now @media.html"
- **Change**: Enhanced navigation by allowing direct links to filtered media sections

### 5/28/25 Post Deletion
- **Original**: Post about FOMC May Meeting Summary
- **Deleted**: Article referenced in post does not exist
- **Prompt**: "delete it. article doesnt exist"
- **Change**: Removed invalid post to maintain data integrity

### 6/3/25 Journal Post Formatting
- **Original**: Informal investment note "Need to relook at $USAAX, $LSGRX, $NWZMX, $FBCGX, $STCIX, $BDAIX. You know what they had in 2023? $NVDA. That's what. Loomis Sayles bought Nvidia on a price dip in 2019!"
- **Updated**: Added trending-up icon, bold title "Investment Portfolio Review", structured description with fund list and NVDA context, and journal link
- **Prompt**: "improve 6/3"
- **Change**: Standardized journal post formatting for personal finance content

### 6/3/25 Ticker Linking
- **Added**: All stock tickers (USAAX, LSGRX, NWZMX, FBCGX, STCIX, BDAIX, NVDA) now link to Yahoo Finance pages
- **Prompt**: "for Tickers make linkable to respective perplexity or yahoo finance page"
- **Change**: Enhanced usability by providing direct access to financial data for mentioned securities

### 6/4/25 Multi-Topic Post Formatting
- **Original**: Informal text with emoji "Circle IPO tomorrow. S-1 Sum in '💸' ipo section. Latest TBPS in watch section."
- **Updated**: Removed emoji, added dollar-sign icon, bold title "Circle IPO and Latest TBPS", structured description with separate sections for IPO and podcast, and consistent links
- **Prompt**: "improve 6/4"
- **Change**: Standardized multi-topic post formatting for announcements combining news and media updates

### 6/4/25 News Article Linking
- **Updated**: Changed IPO link from generic news.html to specific article parameter (news.html?article=circle-ipo)
- **Prompt**: "link should point to position in page where Circle article on @news.html"
- **Change**: Enhanced navigation by linking directly to specific news articles

### 6/4/25 TBPS Cover Image
- **Added**: TBPS podcast cover image from media.json with circular styling
- **Prompt**: "TBPS should have cover image from @json/media.json"
- **Change**: Included visual element for podcast announcement to match media post formatting

### 6/4/25 TBPS Anchor Linking
- **Updated**: TBPS link now points to specific media card using anchor (#bribing-kids-to-stay-off-of-socials-pricey-disney-concerning-job-reports-new-movies-protectionist-policy-in-us)
- **Prompt**: "link to TBPS should point to position on @media.html where it is"
- **Change**: Enhanced navigation by linking directly to the TBPS podcast card on media page

### 6/5/25 Journal Post Formatting
- **Original**: Informal text "New position $IVES maybe it's time for alternative methods to estimate CPI. AI > human enumerators."
- **Updated**: Separated into two distinct sections with individual icons and titles for IVES investment and CPI thoughts
- **Prompt**: "separate IVES and Journal so its clear they are separate"
- **Change**: Enhanced clarity by visually separating different topics within the journal post

### 6/5/25 Journal Anchor Linking
- **Updated**: Journal link now points to specific entry "prognostication-masturbation"
- **Prompt**: "fix View in Journal link to point to position on page"
- **Change**: Improved navigation by linking directly to the relevant journal entry

### 6/20/25 The Animal Kingdom Post
- **Original**: Informal text "The Animal Kingdom watch section."
- **Updated**: Added film icon, bold title, description with director and plot, cover image from media.json, and anchored media link
- **Prompt**: Multiple updates for cover and description
- **Change**: Fully standardized media post with all elements: icon, cover, title, description, and navigation

### 10/29/25 Post Enhancement - Multi-Topic Detail
- **Original**: Brief bullet points with minimal context "Case-Shiller -.3% MoM" and "How to Plead the 5th" without descriptions
- **Updated**: 
  - Made financial data more conversational: "housing market continues cooling off" vs "decline signals continued cooling"
  - Simplified prediction markets: "Patriots 69¢ favorites at home" vs verbose explanation
  - Changed "New Analysis" to "Latest Reads" for more approachable tone
  - Made news descriptions catchy and narrative-driven:
    - "Learn from senior WH aides on how to invoke 5th amendment" (practical, tongue-in-cheek)
    - "Oregon's fighting to legalize these compact Japanese workhorses while other states ban them" (creates tension/conflict vs dry "Analysis of Oregon's bill")
  - Changed article title from "Kei Trucks: Oregon's SB1213" to "Nimble Kei Trucks" (more evocative)
  - Made film description more dramatic: "desperate journey...culminating in a treacherous English Channel swim" vs passive "chronicles the journey"
  - Added director credit "Dir. Philippe Lioret" (shortened to prevent line wrapping)
- **Prompt**: "make expounding a little more catchy and not just analysis of this and that"
- **Change**: Transformed dry analytical descriptions into engaging, story-driven summaries that create intrigue and emotional hooks. Avoid formulaic "Analysis of X" patterns in favor of conflict, action verbs, and human interest angles. Posts should entice clicks through compelling narrative rather than just informational summaries.

### Cover Image Additions - Complete Audit (10/29/25)
- **Comprehensive scan of all posts to ensure cover images are present for all media content**
- **Added covers for:**
  - 10/8/25: The Power of Money book cover
  - 9/16/25: Our Dollar, Your Problem book cover
  - 7/29/25: Hotel Salvation film cover and The Power of Money book cover
  - 10/14/25: Anointed and Replaceable You book covers (enhanced with `clear: both` styling)
  - 8/24/25: World History in Minutes, From Beirut to Jerusalem, The Big Score book covers
  - 8/13/25: Diet, Drugs, and Dopamine book cover
  - 10/4/25: Hardly Strictly Bluegrass festival banner
- **Verified existing covers:**
  - 10/29/25: Welcome film ✓
  - 10/20/25: Sharp Corner film ✓
  - 9/13/25: All We Imagine as Light film ✓
  - 8/26/25: The Seed of the Sacred Fig film ✓
  - 6/20/25: The Animal Kingdom film ✓
  - 5/24/25: A Father's Song music (circular spinning record style) ✓
  - 5/15/25: Holy Spider film ✓
- **Styling notes:**
  - All media images use 60px width with `float: left` and `margin-right: 10px`
  - Music covers use circular styling: `border-radius: 50%; object-fit: cover; height: 60px; animation: spin 3s linear infinite`
  - Multi-book posts use `<br style="clear: both;">` between entries to prevent layout issues
  - All images wrapped in anchor tags linking to specific media.html#slug locations
- **Prompt**: "now scan all of @json/posts.json for cover images missing. use / update @docs/posts-prd.md to ensure none are missing"
- **Change**: Ensured 100% coverage of cover images for all media posts (books, films, music, events) across the entire posts.json file. This provides visual consistency and enhances user engagement throughout the post timeline.

## Post Standardization Complete: New Post Requirements

All posts must meet these requirements. This checklist consolidates all improvements and serves as the definitive standard for post creation.

### Required Elements Checklist

#### 1. Icon (REQUIRED)
- [ ] Every post starts with a Lucide icon: `<i data-lucide='icon-name' class='post-icon'></i>`
- [ ] Icon matches content type (see icon guide in Categories section)
- [ ] Multi-topic posts have separate icons for each section

#### 2. Title (REQUIRED)
- [ ] Bold title immediately follows icon: `<b>Title Here</b>`
- [ ] Title is clear, specific, and engaging
- [ ] For multi-topic posts, each section has its own title

#### 3. Description (REQUIRED)
- [ ] 2-3 sentences maximum
- [ ] Engaging and narrative-driven (not dry analysis)
- [ ] Creates intrigue with action verbs, conflict, or human interest
- [ ] AVOID formulaic patterns like "Analysis of X" or "Explores Y"
- [ ] Examples of good descriptions:
  - ✓ "Learn from senior WH aides on how to invoke 5th amendment"
  - ✓ "Oregon's fighting to legalize these compact Japanese workhorses while other states ban them"
  - ✗ "Analysis of Oregon's SB1213 regarding kei trucks"

#### 4. Cover Images for Media Content (REQUIRED)
- [ ] All media posts (books, films, music, podcasts) include cover images
- [ ] Images pulled from media.json cover field
- [ ] Standard styling: `width: 60px; height: auto; float: left; margin-right: 10px;`
- [ ] Music covers use circular spinning record style: `border-radius: 50%; object-fit: cover; height: 60px; animation: spin 3s linear infinite`
- [ ] Images wrapped in anchor tags linking to media.html#slug
- [ ] Multi-book posts use `<br style="clear: both;">` between entries

**Example:**
```html
<a href="media.html#book-slug"><img src="https://..." alt="Book Title" style="width: 60px; height: auto; float: left; margin-right: 10px;"></a>
```

#### 5. Links (REQUIRED)
- [ ] End with relevant navigation link(s)
- [ ] Use specific anchors, not generic page links:
  - Media: `media.html#slug-name`
  - News articles: `news.html?article=article-slug`
  - Journal entries: `journal.html#entry-slug`
  - Filters: `financials.html?filter=Category%20Name`
- [ ] Stock tickers link to Yahoo Finance: `<a href="https://finance.yahoo.com/quote/TICKER" target="_blank" rel="noopener">TICKER</a>`
- [ ] External links include `target="_blank"` and `rel="noopener"`
- [ ] Link text is bold and action-oriented: `<b>View in Media</b>`, `<b>Read full analysis</b>`

#### 6. Multi-Topic Posts
- [ ] Separate topics with distinct sections
- [ ] Each section has its own icon and title
- [ ] Clear visual separation with `<br><br>` between sections
- [ ] Each topic links to its specific destination

**Example:**
```html
<i data-lucide='trending-up' class='post-icon'></i> <b>First Topic</b><br><br>Description...<br><br><a href="..."><b>Link</b></a><br><br><i data-lucide='newspaper' class='post-icon'></i> <b>Second Topic</b><br><br>Description...<br><br><a href="..."><b>Link</b></a>
```

#### 7. Formatting Standards
- [ ] No emojis (use Lucide icons instead)
- [ ] Line breaks: `<br><br>` for spacing between sections
- [ ] Bullet points: Use `•` or structured HTML bullets
- [ ] Stock tickers: Always link to Yahoo Finance
- [ ] Dates: MM/DD/YY format
- [ ] Numbers: Include context (MoM, YoY, percentages)

#### 8. Content Quality
- [ ] Factually accurate data from latest sources
- [ ] Specific numbers/dates when relevant
- [ ] Proper attribution (source citations)
- [ ] Concise and focused messaging
- [ ] Professional tone (no informal language)

#### 9. Accessibility & Mobile
- [ ] All images have alt text
- [ ] Links have descriptive anchor text
- [ ] Color contrast works in both light and dark modes
- [ ] Images sized appropriately (60px standard)
- [ ] Layout works on mobile (floated images, clear breaks)

#### 10. Validation Before Publishing
- [ ] All links tested and functional
- [ ] Cover images load correctly
- [ ] HTML is valid and properly escaped in JSON
- [ ] Icons render correctly (test in browser)
- [ ] Ticker links go to correct Yahoo Finance pages
- [ ] Multi-topic sections visually separate
- [ ] Tested on both desktop and mobile

### Post Type Templates

#### Financial Data Update
```json
{
  "date": "MM/DD/YY",
  "content": "<i data-lucide='trending-up' class='post-icon'></i> <b>Indicator Name Update</b><br><br>• <b>Month</b>: Value (change from previous)<br>• <b>Trend</b>: Description<br>• <b>Context</b>: What it means<br><br><a href=\"financials.html?filter=Category\"><b>View all indicators</b></a>"
}
```

#### Media Addition (Film/Book)
```json
{
  "date": "MM/DD/YY",
  "content": "<i data-lucide='film' class='post-icon'></i> <a href=\"media.html#slug\"><img src=\"COVER_URL\" alt=\"Title\" style=\"width: 60px; height: auto; float: left; margin-right: 10px;\"></a> <b>Title</b><br><br>Engaging description creating intrigue (not dry analysis). 2-3 sentences max.<br><br><a href=\"media.html#slug\"><b>View in Media</b></a>"
}
```

#### Music Addition
```json
{
  "date": "MM/DD/YY",
  "content": "<i data-lucide='music' class='post-icon'></i> <a href=\"media.html#slug\"><img src=\"COVER_URL\" alt=\"Title\" style=\"width: 60px; height: 60px; border-radius: 50%; object-fit: cover; float: left; margin-right: 10px; animation: spin 3s linear infinite;\"></a> <b>Song Title by Artist</b><br><br>Brief description.<br><br><a href=\"media.html#slug\"><b>Listen Now</b></a>"
}
```

#### News/IPO Announcement
```json
{
  "date": "MM/DD/YY",
  "content": "<i data-lucide='dollar-sign' class='post-icon'></i> <b>Company IPO</b><br><br>Engaging summary with key details. Link ticker: <a href=\"https://finance.yahoo.com/quote/TICKER\" target=\"_blank\" rel=\"noopener\">TICKER</a>.<br><br><a href=\"news.html?article=slug\"><b>Read full analysis</b></a>"
}
```

### Common Mistakes to Avoid

❌ **DON'T:**
- Use dry, academic descriptions ("Analysis of X", "Explores Y")
- Link to generic pages without anchors
- Omit cover images for media content
- Use emojis instead of Lucide icons
- Create wall-of-text descriptions (keep to 2-3 sentences)
- Forget to link stock tickers to Yahoo Finance
- Mix multiple topics without visual separation
- Use informal language or excessive exclamation points

✓ **DO:**
- Write engaging, story-driven descriptions
- Link to specific positions on pages (#anchors, ?article=, ?filter=)
- Include cover images for all media
- Use appropriate Lucide icons
- Keep descriptions concise and compelling
- Link all tickers with target="_blank" and rel="noopener"
- Separate multi-topic posts with distinct sections
- Maintain professional, direct tone

### Quality Standards Summary

Every post represents the site's brand and quality. Posts should:
1. **Inform** - Provide accurate, timely information
2. **Engage** - Create intrigue with compelling descriptions
3. **Navigate** - Link precisely to relevant content
4. **Delight** - Present visually with proper images and icons
5. **Perform** - Work flawlessly on all devices

This standardization work is complete. All future posts must meet these requirements without exception.

## Charts and Data Visualization in Posts

### When to Include Charts

Financial indicator posts benefit from inline sparkline charts that show trend context without requiring a page click. Include charts when:

- Post covers a multi-month indicator trend (3+ months of data)
- Visual trend adds meaningful context (upward vs downward trajectory)
- Space allows without breaking layout on mobile
- Data is simple enough to render clearly in compact format

**Chart Inclusion Rule:**
Always include a chart for single-indicator financial posts with 6+ months of historical data. Examples:
- **10-Year Treasury Yield**: Charts last 8 months (Mar-Nov) showing upward/downward trend
- **NFIB Small Business Optimism Index**: Charts last 8 months showing threshold (100) crossing
- **Consumer Sentiment**: Charts multi-month decline trend with context
- **Manufacturing PMI**: Charts trend relative to 50-point expansion threshold

### Chart Implementation

#### Chart.js Canvas Charts (Required Approach)

The site uses Chart.js for financial indicator charts embedded in posts. This approach provides better rendering consistency and interactive features compared to SVG.

**Implementation Pattern:**

Charts are embedded directly in post markdown files with Canvas elements and JavaScript initialization. Post files are stored in `article/posts/` with YAML frontmatter, markdown content, and embedded JavaScript.

**Post File Structure:**
```markdown
--- 
date: 2025-11-14T14:00:00
---

## Post Title

Post content in markdown...

<div class="chart-container" style="cursor: pointer;" onclick="window.location.href='financials.html?filter=Category'">
  <canvas id="unique-chart-id" width="400" height="200"></canvas>
</div>

<script>
const ctx = document.getElementById('unique-chart-id').getContext('2d');
new Chart(ctx, {
  type: 'line',
  data: {
    labels: ['Month1', 'Month2', ...],
    datasets: [{
      label: 'Indicator Name',
      data: [value1, value2, ...],
      borderColor: '#2C5F5A',
      backgroundColor: 'rgba(44, 95, 90, 0.1)',
      tension: 0.4,
      fill: true
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true } },
    scales: {
      y: {
        min: minValue,
        max: maxValue,
        ticks: {
          callback: function(value) { return value.toFixed(2) + '%'; }
        }
      }
    }
  }
});
</script>

More post content...

<a href="financials.html?filter=Category"><b>View all indicators</b></a>
```

**Key Requirements:**
- Use Chart.js library (already loaded on site)
- Canvas element must have unique `id` attribute
- Chart container should be clickable (points to relevant financials filter)
- Always register post in `json/posts.json` with file reference and timestamp
- Make charts responsive with `responsive: true` and `maintainAspectRatio: false`

**Color Scheme (REQUIRED):**
- Border color: `#2C5F5A` (primary site color)
- Fill color: `rgba(44, 95, 90, 0.1)` (transparent primary color)
- Do NOT use custom colors (#ef4444, #10b981, etc.)
- Colors must work in both light and dark modes

**Chart Configuration:**
- `type: 'line'` for financial trends
- `tension: 0.4` for smooth curves
- `fill: true` for filled area under line
- Y-axis should include min/max bounds with 5-10% padding
- Y-axis ticks should format appropriately (% for rates, whole numbers for indices)

**Lessons Learned:**

❌ **What NOT to do:** Inline SVG charts do not render properly in the post system. Do not attempt SVG sparklines as an alternative.

✓ **What works:** Canvas-based charts using Chart.js library, following existing post examples like `2025-11-12.md`.

#### Data Extraction for Charts

**Steps:**
1. Review indicator data in `financials-data.json`
2. Extract month values from applicable fields (march, april, may, etc.)
3. Calculate Y-axis scale based on min/max values plus 10% padding
4. Format data arrays matching month labels
5. Include appropriate y-axis tick formatting

**Example - 10-Year Treasury Yield:**
- Data: Mar 4.28, Apr 4.28, May 4.42, Jun 4.38, Jul 4.39, Aug 4.27, Sep 4.15, Oct 4.06, Nov 4.13
- Y-axis: min 3.9, max 4.6 (with padding)
- Y-axis format: `.toFixed(2) + '%'`
- Color: Site primary (#2C5F5A)

#### Chart Placement

- Position after main description and key data points
- Wrap in `<div class="chart-container">` for styling
- Make container clickable to navigate to financials page with relevant filter
- Use canvas sizing: `width="400" height="200"` as default
- Responsive configuration allows charts to adapt to mobile screens

**Example:**
```html
<i data-lucide='trending-up' class='post-icon'></i> <b>Treasury Yield Update</b><br><br>
• <b>November</b>: 4.13% (up from October)<br><br>
<div class="chart-container" style="cursor: pointer;" onclick="window.location.href='financials.html?filter=Financial%20Markets'">
  <canvas id="treasury-chart" width="400" height="200"></canvas>
</div>
<script>
// Chart.js initialization...
</script><br><br>
<a href="financials.html?filter=Financial%20Markets"><b>View all indicators</b></a>
```

### Chart Type Selection

| Data Type | Chart Type | Example |
|-----------|-----------|---------|
| Single metric, 6+ months | Chart.js line chart | 10-Year Treasury, NFIB, Manufacturing PMI |
| Single metric, less data | Skip chart, use text | Posts with only 1-2 months of data |
| Multi-series data | Skip chart, use text | Multiple indicators in one post (different scales) |
| Highly volatile data | Skip chart | Weekly claims, daily market data |
| Real-time/daily data | Link to financials.html | Prediction markets with constantly changing odds |

### Accessibility & Performance

- Chart.js charts use canvas rendering (built on site infrastructure)
- Alt text not needed (data explained in surrounding text)
- Responsive design adapts to mobile screens via Chart.js options
- Work in both light and dark modes (use site color scheme #2C5F5A)
- Clickable container provides accessibility and navigation
- Minimal performance impact (Canvas rendering is optimized)

### Common Chart Mistakes to Avoid

❌ **DON'T:**
- Use SVG sparklines (do not render properly in post system)
- Use custom colors (must use site primary #2C5F5A)
- Create charts without the clickable container (reduces interactivity)
- Include charts for posts with less than 6 months of data (insufficient trend)
- Mix multi-indicator charts with different scales (confusing visualization)
- Forget to register the post in json/posts.json
- Overcomplicate with multiple data series (keep to single metric)

✓ **DO:**
- Use Chart.js canvas charts matching existing post patterns (e.g., 2025-11-12.md)
- Always use site color scheme: border `#2C5F5A`, fill `rgba(44, 95, 90, 0.1)`
- Make chart container clickable, pointing to relevant financials filter
- Include 6+ months of data for meaningful trend visualization
- Set Y-axis min/max with 5-10% padding for context
- Test on mobile (responsive: true in Chart.js options)
- Verify data accuracy against source JSON
- Register post with file reference and timestamp in posts.json</content>
</xai:function_call">The Posts PRD has been created at `/Users/benjaminpalmer/TBPS/html/html/docs/posts-prd.md` with comprehensive guidelines for structure, formatting, categories, and best practices based on the existing posts pattern. This should serve as your implementation guide for improving and maintaining the posts system. Let me know if you'd like to adjust any sections or add more details. 

Next post to improve? (The oldest ones like 5/24, 5/25, 5/28, 6/3, etc. appear to need similar formatting updates.) 

<xai:function_call name="read_mcp_resource">
<parameter name="server">filesystem-server
