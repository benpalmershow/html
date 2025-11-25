# Media Addition Workflow

Standard procedure for adding new media entries (books, movies, podcasts, etc.) to media.json.

---

## Table of Contents
1. [Trigger Phrases](#trigger-phrases)
2. [Quick Start](#quick-start)
3. [Step-by-Step Workflow](#step-by-step-workflow)
4. [Cover Image Sourcing](#cover-image-sourcing)
5. [JSON Templates](#json-templates)
6. [Category Reference](#category-reference)
7. [Special Cases](#special-cases)
8. [Error Handling](#error-handling)
9. [Batch Processing](#batch-processing)

---

## Trigger Phrases

When user prompts:
- `"add new book, title: [TITLE]"`
- `"add new movie, title: [TITLE]"`
- `"add new podcast, title: [TITLE]"`
- `"add new album, title: [TITLE]"`
- `"add book: [TITLE]"` (shorthand)
- `"add books: [TITLE1], [TITLE2]"` (batch)

---

## Quick Start

1. **Gather metadata:** Title, author/creator, publication date, category, description
2. **Source cover image:** Use priority order (Syndetics → Open Library → others)
3. **Verify cover visually:** Title + author on cover must match exactly
4. **Format JSON:** Use correct template (book/movie/podcast)
5. **Present for confirmation:** Show entry and ask before adding
6. **Insert atomically:** Add all entries at once

---

## Step-by-Step Workflow

### Step 1: Information Gathering

**Required fields:**
- Title
- Author/Creator/Artist
- Publication/Release date
- Category/Genre (see [Category Reference](#category-reference))
- Description (1-2 sentences, concise)
- mediaType (book, movie, podcast, video, song, album, playlist)

**Optional fields:**
- ISBN (for books)
- Ratings (Goodreads, Amazon, Rotten Tomatoes, IMDB)
- External links
- Tags (use sparingly)
- Thumbs rating (up, neutral, down, or empty)

**Author Verification Checklist:**
- [ ] Check for multiple authors with same name
- [ ] Verify publication year matches author's active period
- [ ] Cross-reference with other known works
- [ ] Note middle initials or suffixes if needed (Jr., III, etc.)

**ISBN Discovery (for books):**
1. Search "[Title] [Author] ISBN"
2. Check publisher website or book retailers
3. Query OpenLibrary API: `https://openlibrary.org/search.json?title=[TITLE]&author=[AUTHOR]`
4. Use ISBN-13 format for Syndetics compatibility
5. Note: Books without ISBN exist; use Open Library title search as fallback

---

### Step 2: Cover Image Sourcing

**Reliability Hierarchy**

| Reliability | Source | Best For |
|---|---|---|
| ✅ MOST | Syndetics/SFPL | Books with ISBN |
| ✅ MOST | Open Library | Books (archive.org backed) |
| ✅ RELIABLE | Internet Archive | Books/historical items |
| ✅ RELIABLE | Publisher official | All (most current) |
| ✅ RELIABLE | Amazon/B&N | Books (stable URLs) |
| ⚠️ MEDIUM | Google Books API | Books (may change) |
| ⚠️ MEDIUM | TMDB | Movies only |
| ❌ AVOID | Blog/review articles | Temporary links |
| ❌ AVOID | URLs with query params | Cache-busting (temporary) |
| ❌ AVOID | `i0.wp.com`, `cdn.*.com/temp/` | Unreliable subdomains |
| ❌ AVOID | Goodreads images | Frequently change |

**Domain Reliability Red Flags**
- Query parameters: `?resize=`, `?ssl=1`, `?v=`
- Blog/review sites: `.wordpress.com`, Medium, Substack
- Temporary hosting indicators: Cache-busting params
- Personal/author websites: Often removed or rehosted
- Shortened/obfuscated URLs

---

### Step 3: Visual Verification (MANDATORY)

Before accepting any cover URL:

**Verification Checklist:**
- [ ] URL loads successfully (not 404)
- [ ] Image shows actual book cover (not placeholder)
- [ ] Title on cover matches book title exactly
- [ ] Author name on cover matches author
- [ ] Cover design appropriate for publication year
- [ ] No mismatches (e.g., "Collected Works" vs. single work)
- [ ] Edition matches (hardcover vs. paperback vs. special)

**Common Mismatch Scenarios:**
- ISBN reuse by publishers for different editions/books
- Similar titles by same author (e.g., "Collected Works" vs. specific title)
- Regional variations (UK vs. US editions)
- Out-of-print editions with substitute covers
- Placeholder/generic "book" icons

**If verification impossible:**
- DO NOT use cover URL
- State: "Cover image could not be verified from reliable source"
- Provide ISBN for user to manually check
- Proceed without cover rather than with wrong cover
- Wrong cover = data integrity failure—avoid at all costs

---

### Step 4: Cover Source Priority List

Test sources in this order (stop when you find verified image):

**1. Syndetics (via SFPL) - PREFERRED for books**
```
https://www.syndetics.com/index.aspx?isbn=[ISBN]&issn=/LC.JPG&client=sfpl&type=xw12&oclc=[OCLC]
```

**2. Open Library Covers**
```
https://covers.openlibrary.org/b/isbn/[ISBN]-L.jpg
https://covers.openlibrary.org/b/id/[COVER_ID]-L.jpg
```
Find COVER_ID: `https://openlibrary.org/search.json?isbn=[ISBN]`, extract `cover_i`

**3. Google Books API**
```
https://books.google.com/books/content?id=[BOOK_ID]&printsec=frontcover&img=1&zoom=1
https://books.google.com/books/publisher/content/images/frontcover/[BOOK_ID]?fife=w400-h600
```
Find BOOK_ID: `https://www.googleapis.com/books/v1/volumes?q=isbn:[ISBN]`

**4. Internet Archive**
```
https://archive.org/services/img/isbn_[ISBN]
```
Example: `https://archive.org/services/img/isbn_9780691233420`

**5. WorldCat/OCLC**
```
https://www.worldcat.org/title/[OCLC_NUMBER]/coverart.jpg
```

**6. LibraryThing**
```
https://covers.librarything.com/devkey/[DEVKEY]/large/isbn/[ISBN]
```

**7. Amazon Images**
```
https://m.media-amazon.com/images/P/[ISBN].01._SCLZZZZZZZ_SX500_.jpg
```
Use 10-digit ISBN; adjust SX500 for width

**8. Barnes & Noble**
```
https://prodimage.images-bn.com/pimages/[ISBN]_p0_v1_s1200x630.jpg
```
Use 13-digit ISBN

**9. Publisher Direct** (new releases)
- Penguin Random House: Check product page
- HarperCollins: `https://www.harpercollins.com/cdn/shop/products/[PRODUCT_ID].jpg`
- Others: Check official publisher sites

**10. TMDB (movies ONLY)**
```
https://media.themoviedb.org/t/p/w500/[PATH].jpg (recommended)
https://media.themoviedb.org/t/p/w780/[PATH].jpg (higher quality)
```
**IMPORTANT:** Use `media.themoviedb.org` (NOT `www.themoviedb.org`) to avoid CORS issues.

**11. Wikipedia/Wikimedia Commons** (classic/notable books)
```
https://upload.wikimedia.org/wikipedia/en/[hash]/[hash]/[filename].jpg
```

---

### Step 5: Data Structuring

**Book Template:**
```json
{
  "title": "",
  "author": "",
  "category": "",
  "mediaType": "book",
  "description": "",
  "date": "YYYY",
  "genre": "",
  "titleColor": "#ffffff",
  "tag": "",
  "thumbs": "",
  "cover": "",
  "amazon": "",
  "goodreads": "",
  "embedUrl": "",
  "ratings": {
    "gr": {"score": "", "url": ""},
    "amz": {"score": "", "url": ""}
  },
  "dateAdded": "YYYY-MM-DD"
}
```

**Movie Template:**
```json
{
  "title": "",
  "author": "",
  "mediaType": "movie",
  "description": "",
  "date": "YYYY",
  "genre": "",
  "titleColor": "#ffffff",
  "tag": "",
  "thumbs": "",
  "cover": "",
  "imdb": "",
  "rottenTomatoes": "",
  "embedUrl": "",
  "ratings": {
    "rt": {"score": "", "url": ""},
    "imdb": {"score": "", "url": ""}
  },
  "dateAdded": "YYYY-MM-DD"
}
```

**Podcast Template:**
```json
{
  "title": "",
  "author": "",
  "mediaType": "podcast",
  "description": "",
  "date": "Month YYYY",
  "icon": "fas fa-microphone",
  "links": [
    {"label": "Apple Podcasts", "icon": "fab fa-apple", "url": ""},
    {"label": "Spotify", "icon": "fab fa-spotify", "url": ""},
    {"label": "YouTube", "icon": "fab fa-youtube", "url": ""}
  ],
  "thumbs": "",
  "cover": "",
  "embedUrl": "",
  "url": "",
  "dateAdded": "YYYY-MM-DD"
}
```

**Playlist Template:**
```json
{
  "title": "",
  "author": "",
  "mediaType": "playlist",
  "date": "Month YYYY",
  "icon": "fas fa-podcast",
  "cover": "images/listen.png",
  "description": "",
  "links": [],
  "thumbs": "",
  "dateAdded": "YYYY-MM-DD"
}
```

---

### Step 6: Field Guidelines

**Title Color**
- Default: `"#ffffff"` (white)
- Special cases: Use hex colors complementing cover art

**Date Formats**
- Books/Movies: `"YYYY"` (year only)
- Books (alternative): `"Month YYYY"`
- Podcasts/Playlists: `"Month YYYY"`
- dateAdded: Always `"YYYY-MM-DD"` (ISO 8601)

**Thumbs Rating**
- `"up"` = Recommended/Excellent
- `"neutral"` = Mixed/Average
- `"down"` = Not recommended (rarely used)
- `""` = No rating

**Tags**
- Use sparingly
- Examples: "Classic", "Favorite", "Informative", "COVID-19"
- Leave empty if not applicable

**Description Writing**
- **Length:** 1-2 sentences maximum
- **Tone:** Factual, not promotional
- **Focus:** Content/subject matter, not marketing language
- **Avoid:** Superlatives, weak verbs (explores, examines, discusses)
- **Prefer:** Active verbs (chronicles, analyzes, reveals, traces, investigates)
- **Lead with substance:** Start with actual subject matter
- **Expert angle:** Point out hidden assumptions, biases, insights experts notice

**Examples:**
- ❌ "Explores the history of money in America"
- ✅ "Chronicles how central banks create money and shape economic policy"

**Description by Type:**
- **Academic/scholarly:** Thesis, scope, methodology
- **Popular science:** Topic + unique angle/approach
- **Memoir:** Central narrative arc or defining theme
- **Technical/Programming:** Problem addressed + methodology
- **Biography:** Subject significance + time period
- **History:** Time period, geography, central events
- **Self-Help:** Core problem + approach

---

### Step 7: Quality Checks

Before finalizing, verify:
- [ ] All required fields populated
- [ ] **Cover VISUALLY VERIFIED to match title and author**
- [ ] Cover URL tested (not 404, loads successfully)
- [ ] Cover shows correct book (not different edition/collected works)
- [ ] Date format consistent with existing entries
- [ ] Category from established list (see Category Reference)
- [ ] Description concise and informative
- [ ] JSON syntax valid (no trailing commas)
- [ ] dateAdded is current date (ISO format)
- [ ] ISBN matches specific edition
- [ ] Rating/link URLs functional (if provided)

---

### Step 8: User Confirmation

**Always present:**
1. Complete JSON entry (code block)
2. Cover image preview (mention if visible/verified)
3. Request confirmation before adding
4. Offer to adjust any fields
5. Validate final JSON before insertion

**Sample message:**
```
I've prepared the following entry for "The Power of Money" by Paul Sheard:
- Category: Economics
- Cover: Verified via Syndetics (ISBN 9781637743157)
- Description: Chronicles how central banks create money and shape economic policy
- Date added: 2025-11-22

Proceed with adding to media.json, or would you like to adjust any fields?
```

---

## Cover Image Sourcing

### Local Image Hosting (When Hotlinks Fail)

For media with unreliable hotlinks or frequent failures, host locally in `images/` directory using WebP format.

**When to use:**
- URLs consistently fail (403, CORS errors, broken links)
- External sources slow or non-CDN
- Reducing external dependencies

**Implementation:**
1. Download image from verified source
2. Convert to WebP: `ffmpeg -i cover.jpg -c:v libwebp cover.webp`
3. Save to `images/media-title.webp` (kebab-case)
4. Update media.json: `"cover": "images/media-title.webp"`
5. Optional: Add srcset: `"coverSrcset": "images/media-title-240.webp 240w, images/media-title-360.webp 360w"`

**Benefits:**
- No CORS issues, guaranteed availability
- WebP: 30-40% smaller than JPEG, lossless quality
- CDN-ready for Vercel/similar
- No external dependency tracking

**Examples:**
- "Replaceable You": `"cover": "images/replaceable-you.webp"`
- "Land Power": `"cover": "images/land-power.webp"`

---

## JSON Templates

See Step 5 above for all templates.

---

## Category Reference

**Established categories:**
Economics, Finance, History, Biography, Memoir, Political Science, Psychology, Technology, Health, Self-Help, Fiction, Poetry, Programming, Sociology, Urban Studies, Law, Travel, Gardening, Food & Drink, Business & Technology, Science, Philosophy, Children's, Literature, Investigative, True Crime, Education

**Selection priority:**
1. Primary subject matter (what is it fundamentally about?)
2. Author's field (if spanning multiple categories)
3. Existing categories (avoid creating new ones)
4. Use "genre" field for secondary classifications

**Decision examples:**
- Business book about religion → "Sociology" (social phenomena) OR "Business & Technology" (business strategy)
- Medical history → "Science" (technical/medical) OR "History" (narrative focus)
- Economic policy → "Economics" (theory) OR "Political Science" (policy)
- Tech biography → "Biography" (life story) OR "Technology" (industry focus)

**When uncertain:**
- Choose category describing primary reader interest
- Consider bookstore shelf placement
- Align with similar books in collection

---

## Special Cases

### Books without ISBN
- Use Open Library title/author search
- Check Goodreads for cover images
- Fall back to Wikipedia if available

### International/Foreign Language Media
- Include language in description or tag
- Use original title with English subtitle if applicable
- Source covers from international databases

### Self-Published/Indie Content
- May require direct contact for permissions
- Document cover image source
- Note availability limitations in description

### Podcasts/Episodes
- Use show artwork for cover
- Link to specific episode when applicable
- Include multiple platform links (Apple, Spotify, YouTube)

### Playlists
- Use consistent cover image (e.g., `images/listen.png`)
- Include platform links (YouTube Music, Spotify)
- Description often empty for thematic collections
- Follow naming: "MonthCara" for monthly releases
- mediaType: "playlist"
- Icon: "fas fa-podcast"

---

## Error Handling

### Cover URL Loading Fails

**Check domain reliability first:**
- Blog/review images (`i0.wp.com`, Medium)? → Try Syndetics immediately
- Query parameters (`?resize=`, `?ssl=1`)? → Indicates temporary hosting

**Recovery steps:**
1. Try all reliable sources in priority order
2. Visually verify each source
3. Cross-reference with Amazon, Goodreads, publisher
4. Document inability to find verified hotlink
5. **Proceed without cover rather than with wrong cover**
6. Note: "Cover image could not be verified from reliable source - ISBN provided for manual verification"

### Cover Image Mismatch Detected

**STOP immediately—do not use mismatched cover.**

1. Document mismatch (e.g., "Syndetics shows 'Collected Writings' but book is 'Common Sense'")
2. Try alternate ISBN sources
3. Verify ISBN accuracy against retailers
4. Check if ISBN was reused or references different edition
5. If no verified match: Leave cover field empty
6. Alert user + provide ISBN for manual check

**Common causes:**
- ISBN reuse by publisher
- Wrong edition (hardcover ISBN used for paperback)
- Similar titles by same author
- Collected works vs. individual title
- Regional edition differences (UK vs. US)
- Out-of-print editions

### YouTube Trailer Unavailable

1. Set `"embedUrl": ""` (empty string)
2. Trailer is optional—cover + metadata sufficient
3. Don't embed from IMDB/Rotten Tomatoes
4. Reference existing entries for best practices

### Critical Metadata Missing

- Explicitly note what's missing
- Provide partial entry with gaps identified
- Offer to research further if user provides context

### Duplicate Entry Suspected

- Check existing entries by title
- Verify author/date to confirm uniqueness
- Alert user to potential duplicate
- Add edition info if different version

---

## Batch Processing

**Trigger:** User provides 2+ titles in single request

**Example:**
```
add books: Anointed by Toby Stuart, Replaceable You by Mary Roach
```

**Process:**
1. **Sequential processing:** Handle each item in order
2. **Parallel research:** Gather metadata for all items simultaneously
3. **Unified presentation:** Show all entries together
4. **Issue highlighting:** Flag problems (missing covers, category ambiguity, author disambiguation needed)
5. **Flexible confirmation:** Allow bulk approval or individual edits
6. **Atomic insertion:** Add all entries at once to maintain consistency

**Response format:**
```
I've prepared 2 entries:

[Entry 1 details with cover, category, description]
[Entry 2 details with cover, category, description]

Issues detected:
- Entry 1: Category could be Sociology or Business & Technology (chose Sociology)
- Entry 2: Cover verified via Syndetics

Proceed with adding all entries? Or adjust any?
```

---

## Post Integration (Optional)

If user requests announcement in `article/posts/YYYY-MM-DD.md`:

1. Create new section: `## New Book/Movie/etc.: [Title]`
2. Add cover image floated right with border
3. Include concise description (matching media.json entry)
4. Add media link to `media.html`
5. Follow existing HTML structure with `<p class="section-links">` and `<div style="clear: both;"></div>`

**Example:**
```markdown
## New Book: Land Power
<img src="https://publisher-site.com/cover.jpg" alt="Land Power cover" style="width: 100px; height: auto; float: right; margin-left: 10px; border: 2px solid #ddd; border-radius: 4px;">

Added "Land Power" by Michael Albertus to the media collection. The book examines how land ownership shapes societal outcomes, from inequality and development to environmental sustainability.

<p class="section-links">
<a href="media.html" title="View media collection"><img src="images/media.png" alt="Media" style="width: 1.2em; height: auto;"> Media</a>
</p>
<div style="clear: both;"></div>
```

---

## Consistency Requirements

**Mandatory:**
- Date formats match existing patterns
- Categories from established list only
- Valid JSON syntax
- Cover URLs tested and working
- All entries have dateAdded

**Style:**
- Double quotes in JSON
- No trailing commas
- 2-space indentation
- Empty strings for unused fields (not null)
- Arrays for multiple values (links, genres)

---

## Lessons Learned

### Domain Reliability First (Critical Lesson)
**From "The Power of Money" failure:**
- Original URL: `https://i0.wp.com/blogs.cfainstitute.org/...?resize=400%2C245&ssl=1`
- Issue: WordPress blog with cache-busting = unreliable hotlink
- Fix: Switched to Syndetics with ISBN 9781637743157
- **Prevention:** Always check domain reliability BEFORE testing URL

### Cover Sourcing for New Releases
**From "Land Power" success:**
- Publisher direct URLs work reliably for new releases
- Browser tools enable verification without visual access
- Test at least 3-4 sources before declaring cover unavailable
- Document which source worked for similar books

### TMDB Poster Format Standardization (Critical Lesson)
**From "La Haine" correction:**
- Original issue: Cover URL used `https://www.themoviedb.org/t/p/w1280/...`
- Problem: Wrong domain (www vs media) and wrong size (w1280 vs w500)
- Fix: Changed to `https://media.themoviedb.org/t/p/w500/[PATH].jpg`
- **Prevention:** Always use `media.themoviedb.org` CDN (CORS-friendly) with `w500` size (~50KB, optimal for mobile)
- Never use `www.themoviedb.org` or oversized variants (w780, w1280, original)

### Movie Trailer Embedding
**From "La Haine" implementation:**
- embedUrl field enables YouTube trailer button in media overlay
- Format: `https://www.youtube.com/embed/[VIDEO_ID]?si=[SESSION_ID]`
- Trailer button appears inline on movie cards with ratings
- Optional field—cover + metadata sufficient without trailer
- Use BFI or official studio uploads for reliability over fan-uploaded trailers

### Future Enhancements
- Integrate Goodreads/Amazon ratings automatically via API
- Implement batch post updates
- Local hosting automation if hotlinking becomes unreliable
- Category validation against existing entries
