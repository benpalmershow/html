# Product Requirements Document: Media Card Addition

## Overview
Standard operating procedure for adding new media entries (books, movies, podcasts, etc.) to the media.json file with proper formatting, metadata, and cover image sourcing.

---

## Trigger Phrase
When user prompts: **"add new book, title: [TITLE]"** or similar variations:
- "add new movie, title: [TITLE]"
- "add new podcast, title: [TITLE]"
- "add new album, title: [TITLE]"
- "add new song, title: [TITLE]"
- "add book: [TITLE]"
- "add album: [TITLE]"
- "add song: [TITLE]"
- **Multiple items:** "add books: [TITLE1], [TITLE2], [TITLE3]"

---

## Batch Processing Mode

### When Multiple Titles Provided
**Trigger:** User provides 2+ titles in single request

**Process:**
1. **Sequential processing:** Handle each item in order
2. **Parallel research:** Gather metadata for all items
3. **Unified presentation:** Show all entries together
4. **Issue highlighting:** Flag any problems (missing covers, ambiguous categories, author disambiguation needed)
5. **Flexible confirmation:** Allow bulk approval or individual edits
6. **Atomic insertion:** Add all entries at once to maintain consistency

**Example batch format:**
```
add books: Anointed by Toby Stuart, Replaceable You by Mary Roach
```

**Response format:**
```
I've prepared 2 entries:

[Entry 1 details with cover, category, description]
[Entry 2 details with cover, category, description]

Issues detected:
- Entry 1: Category could be Sociology or Business & Technology (chose Sociology based on social phenomena focus)
- Entry 2: Cover verified via Syndetics

Proceed with adding all entries? Or would you like to adjust any?
```

---

## Local Image Hosting (Optional)

For media entries with unreliable hotlinks or frequent access failures, consider hosting images locally in the `images/` directory using WebP format for optimal performance.

**When to use local hosting:**
- Cover URLs consistently fail to load (403, CORS errors, broken links)
- Movie posters from slow external sources (non-CDN providers)
- Reducing external dependencies for faster, more reliable site performance

**Implementation:**
1. Download image from verified hotlink source
2. Convert to WebP format: `ffmpeg -i cover.jpg -c:v libwebp cover.webp`
3. Save to `images/media-title.webp` (kebab-case filename)
4. Update media.json: `"cover": "images/media-title.webp"`
5. Optional: Add srcset for responsive images
   - `"coverSrcset": "images/media-title-240.webp 240w, images/media-title-360.webp 360w"`
   - Generate smaller variants using ffmpeg or ImageMagick

**Benefits:**
- No CORS issues, guaranteed availability
- WebP format: 30-40% smaller than JPEG, lossless quality
- CDN-ready if hosted on Vercel or similar
- No external dependency tracking needed

**Examples from media.json:**
- "Replaceable You": `"cover": "images/replaceable-you.webp"`
- "Land Power": `"cover": "images/land-power.webp"`

---

## Automated Workflow

### Step 1: Information Gathering
**Required fields to collect:**
1. Title (provided by user)
2. Author/Creator/Artist
3. Publication/Release date
4. Category/Genre
5. Description (concise, 1-2 sentences)
6. mediaType (book, movie, podcast, video, song, album, playlist)

**Optional fields:**
- ISBN (for books)
- Ratings (Goodreads, Amazon, RT, IMDB)
- Links (purchase, streaming, official sites)
- Tags
- Thumbs rating (up, down, neutral)

**ISBN Discovery (for books):**
1. Search "[Title] [Author] ISBN" in web search
2. Check publisher website or book retailers
3. Use Library of Congress search
4. OpenLibrary API: `https://openlibrary.org/search.json?title=[TITLE]&author=[AUTHOR]`
5. Google Books API as fallback
6. Prefer ISBN-13 format for Syndetics compatibility

**Author Verification:**
1. Check for multiple authors with same name
2. Verify publication year matches author's active period
3. Cross-reference with other known works by author
4. Note middle initials or suffixes if needed (e.g., "Jr.", "III")
5. For common names, verify through publisher or biographical data

### Step 2: Cover Image Sourcing
**Priority order for hotlinkable covers:**

1. **Syndetics (via SFPL)** - PREFERRED for books
   ```
   https://www.syndetics.com/index.aspx?isbn=[ISBN]&issn=/LC.JPG&client=sfpl&type=xw12&oclc=[OCLC]
   ```

2. **Open Library Covers**
   ```
   https://covers.openlibrary.org/b/isbn/[ISBN]-L.jpg
   https://covers.openlibrary.org/b/id/[COVER_ID]-L.jpg
   ```
   - Find COVER_ID by searching: `https://openlibrary.org/search.json?isbn=[ISBN]`
   - Extract `cover_i` value from response

3. **Google Books API**
   ```
   https://books.google.com/books/content?id=[BOOK_ID]&printsec=frontcover&img=1&zoom=1
   https://books.google.com/books/publisher/content/images/frontcover/[BOOK_ID]?fife=w400-h600
   ```
   - Find BOOK_ID via: `https://www.googleapis.com/books/v1/volumes?q=isbn:[ISBN]`
   - Extract `id` from response
   - Alternative: Use `volumeInfo.imageLinks.thumbnail` from API response

4. **Internet Archive**
   ```
   https://archive.org/services/img/[IDENTIFIER]
   ```
   - Search archive.org for book title + author
   - Use identifier from book's archive.org URL
   - Example: `https://archive.org/services/img/isbn_9780691233420`

5. **WorldCat/OCLC**
   ```
   https://www.worldcat.org/title/[OCLC_NUMBER]/coverart.jpg
   ```
   - Find OCLC number via WorldCat.org search
   - May require OCLC number lookup

6. **LibraryThing**
   ```
   https://covers.librarything.com/devkey/[DEVKEY]/large/isbn/[ISBN]
   ```
   - Public API available with developer key
   - Alternative: `https://www.librarything.com/isbn/[ISBN]` (scraping)

7. **Goodreads** (indirect - requires extraction)
   ```
   https://images.gr-assets.com/books/[ID]/[ID].jpg
   https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/[TIMESTAMP]/[ID]._[SIZE]_[HASH].jpg
   ```
   - Must extract image URL from Goodreads book page
   - Not directly constructable from ISBN
   - Search: `https://www.goodreads.com/search?q=[ISBN]`

8. **Amazon Images** (via direct product page)
   ```
   https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/[ID]/[ID].jpg
   https://m.media-amazon.com/images/I/[ID]._SY522_.jpg
   https://m.media-amazon.com/images/P/[ISBN].01._SCLZZZZZZZ_SX500_.jpg
   ```
   - Direct ISBN method: Replace [ISBN] with 10-digit ISBN
   - SX500 = width 500px, adjust as needed

9. **Barnes & Noble**
   ```
   https://prodimage.images-bn.com/pimages/[ISBN]_p0_v1_s1200x630.jpg
   ```
   - Use 13-digit ISBN

10. **Bookshop.org** (indirect)
    - Hotlinking may not be reliable
    - Check product page for image URL
    - Format varies

11. **Publisher Direct** (varies by publisher)
    - **Penguin Random House:** Check book product page
    - **HarperCollins:** `https://www.harpercollins.com/cdn/shop/products/[PRODUCT_ID].jpg`
    - **Simon & Schuster:** Check product page  
    - **Macmillan:** Check product page
    - **Hachette:** Check product page
    - Most reliable for new releases

12. **Edelweiss/Above The Treeline**
    ```
    https://widget.edelweiss.plus/covers/[ISBN].jpg
    ```
    - Professional book trade catalog
    - May require verification

13. **TMDB (for movies ONLY)**
     ```
     https://media.themoviedb.org/t/p/w500/[PATH].jpg (recommended - fast load)
     https://media.themoviedb.org/t/p/w780/[PATH].jpg (higher quality, still fast)
     https://media.themoviedb.org/t/p/original/[PATH].jpg (avoid - slow)
     ```
     
     **IMPORTANT: Use `media.themoviedb.org` (not `www.themoviedb.org`) to avoid CORS issues**
     
     **Size guidance:**
     - `w500`: Recommended for web - 500px width, ~50KB, fast load
     - `w780`: High quality, ~100KB, acceptable for featured items
     - `original`: Only for local hosting, avoid hotlinking (slow, large file)
     
     **Common sizes available:** w92, w154, w185, w342, w500, w780, original

14. **Wikipedia/Wikimedia Commons**
    ```
    https://upload.wikimedia.org/wikipedia/en/[hash]/[hash]/[filename].jpg
    ```
    - Search Wikipedia article for book
    - Right-click cover image → Copy Image Address
    - Reliable for classic/notable books

15. **Book Depository** (if available in your region)
    ```
    https://d1w7fb2mkkr3kw.cloudfront.net/assets/images/book/[size]/[ISBN].jpg
    ```
    - Sizes: lrg, mid, sml

**CRITICAL: Cover Image Verification Protocol**

**Step 2.1: Visual Verification (MANDATORY)**
Before accepting any cover URL, you MUST verify:

1. **Load the URL yourself** - Actually access the URL to see what image displays
2. **Match against book details:**
   - Does the title on the cover match the book title exactly?
   - Does the author name on the cover match?
   - Does the cover design match descriptions from retailer sites?
   - Does the publication year seem appropriate for the design style?

3. **Common mismatch scenarios to watch for:**
   - **ISBN reuse:** Publishers sometimes reuse ISBNs for different editions or completely different books
   - **Similar titles:** "Collected Works" vs. specific titles
   - **Author name confusion:** Multiple books by same author
   - **Wrong edition:** Hardcover vs. paperback vs. special edition covers
   - **Placeholder images:** Generic "book" icons or publisher logos
   - **Regional variations:** UK vs. US editions with different covers

4. **Verification checklist:**
   - [ ] URL loads successfully (not 404)
   - [ ] Image shows actual book cover (not placeholder)
   - [ ] Title on cover matches book title
   - [ ] Author name on cover matches author
   - [ ] Cover design is appropriate for publication year
   - [ ] No obvious mismatches (e.g., "Collected Writings" when book is single work)

**Step 2.2: Cross-Reference Verification**
When in doubt, cross-reference against multiple sources:

1. **Amazon product page** - Search for exact title + author
2. **Goodreads** - Verify cover image matches
3. **Publisher website** - Official cover is authoritative
4. **Google Images** - Search "book title author cover" and compare results
5. **Library catalogs** - WorldCat, Library of Congress

**Step 2.3: ISBN Accuracy**
- Verify ISBN matches the EXACT edition you're cataloging
- Check ISBN-10 and ISBN-13 both reference same book
- Be aware: Same title can have multiple ISBNs (hardcover, paperback, ebook, international editions)
- When ISBNs conflict, prefer the edition most commonly available

**Step 2.4: Hotlink Reliability & CORS Issues**

**Reliable hotlink sources (recommended):**
- `media.themoviedb.org` - CORS-friendly, CDN-backed, fast delivery
- `covers.openlibrary.org` - Reliable for books, public domain
- `syndetics.com` via SFPL - Professional library service, requires ISBN
- Amazon images (specific formats) - Stable URLs for book covers

**Avoid or use with caution:**
- External publisher websites - May block hotlinking or change URLs frequently
- `pics.filmaffinity.com` - May have CORS restrictions
- Personal/small sites - High failure rate, no CDN support
- `www.themoviedb.org/t/p/...` - Use `media.themoviedb.org` instead (CORS)

**Step 2.5: Fallback Process**
If primary source URL shows wrong cover:

1. **DO NOT USE IT** - Wrong cover is worse than no cover
2. Try next source in priority list, prioritizing CORS-friendly sources
3. Cross-reference with Amazon product page
4. Check publisher website for official cover
5. Try Goodreads image extraction
6. If all automated sources fail: Search Google Images for "[title] [author] book cover"
7. **Consider local hosting** if hotlink sources are unreliable (see Local Image Hosting below)
8. If still no verified match: Note "verified cover image unavailable via hotlink"
9. Consider requesting user to provide correct cover URL

**Step 2.6: Documentation**
When cover source is verified:
- Note which source provided correct image
- Document any ISBN issues encountered
- Flag books with problematic cover sourcing for future reference

**FAILURE MODE:**
If you cannot verify the cover image is correct:
- State explicitly: "I cannot verify the cover image for this book"
- Provide the ISBN and title for user to check manually
- Offer to proceed without cover URL rather than with wrong cover
- Wrong cover is a DATA INTEGRITY FAILURE - avoid at all costs

**Image validation:**
- Test URL accessibility (browser check or HEAD request)
- Verify image loads correctly (not placeholder or 404)
- **VERIFY VISUAL MATCH:** Title and author on cover must match book
- Prefer high-resolution versions (-L suffix for Open Library)
- Ensure stable, long-term hosting
- For failed URLs or mismatches:
  - Try alternate ISBN formats (13-digit vs 10-digit)
  - Try multiple sources in priority order
  - Check for URL encoding issues
  - Try publisher direct image
  - Cross-reference with retailer product pages
  - Document pattern for future reference

**Cover Image Testing Protocol:**
1. Construct URL from ISBN/ID using multiple sources
2. Test URL accessibility for each source
3. **VERIFY VISUAL CONTENT MATCHES BOOK** (critical step)
4. Check title on cover matches book title
5. Check author on cover matches book author
6. If mismatch, try next source in priority list
7. Test at least 3-4 sources before declaring cover unavailable
8. If all sources fail or show wrong image, note "cover unavailable"
9. Document which source worked for future similar books

### Step 3: Data Structuring

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
    "gr": {
      "score": "",
      "url": ""
    },
    "amz": {
      "score": "",
      "url": ""
    }
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
    "rt": {
      "score": "",
      "url": ""
    },
    "imdb": {
      "score": "",
      "url": ""
    }
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
    {
      "label": "Apple Podcasts",
      "icon": "fab fa-apple",
      "url": ""
    },
    {
      "label": "Spotify",
      "icon": "fab fa-spotify",
      "url": ""
    },
    {
      "label": "YouTube",
      "icon": "fab fa-youtube",
      "url": ""
    }
  ],
  "thumbs": "",
  "cover": "",
  "embedUrl": "",
  "url": "",
  "dateAdded": "YYYY-MM-DD"
}
```

### Step 4: Category Classification

**Standard categories:**
- Economics
- Finance
- History
- Biography
- Memoir
- Political Science
- Psychology
- Technology
- Health
- Self-Help
- Fiction
- Poetry
- Programming
- Sociology
- Urban Studies
- Law
- Travel
- Gardening
- Food & Drink
- Business & Technology
- Science
- Philosophy
- Children's
- Literature
- Investigative
- True Crime
- Education

**Category Selection Priority:**
1. **Primary subject matter** - What is the book fundamentally about?
2. **Author's field** - Use if subject spans multiple categories
3. **Prefer established categories** - Avoid creating new ones unless absolutely necessary
4. **Use "genre" field** for secondary classifications
5. **Decision examples:**
   - Business book about religion → "Sociology" (if studying social phenomena) or "Business & Technology" (if focused on business strategy)
   - Medical history → "Science" (if technical/medical focus) or "History" (if historical narrative focus)
   - Economic policy → "Economics" (theory/analysis) or "Political Science" (policy focus)
   - Tech biography → "Biography" (life story focus) or "Technology" (tech industry focus)

**When uncertain:**
- Choose the category that best describes the reader's primary interest
- Consider where the book would be shelved in a bookstore
- Align with similar books already in the collection

### Step 5: Field Guidelines

**Title Color:**
- Default: `"#ffffff"` (white)
- Special cases: Use hex colors that complement cover art

**Date Format:**
- Books: `"January YYYY"` or `"YYYY"`
- Movies: `"YYYY"`
- Podcasts: `"Month YYYY"`
- dateAdded: Always `"YYYY-MM-DD"` (ISO 8601)

**Thumbs Rating:**
- `"up"` - Recommended/Excellent
- `"neutral"` - Mixed/Average
- `"down"` - Not recommended (rarely used)
- `""` - No rating

**Tags:**
- Use sparingly
- Examples: "Classic", "Favorite", "Informative", "COVID-19", "Middle East"
- Leave empty if not applicable

**Description:**
- Concise: 1-2 sentences maximum
- Factual, not promotional
- Focus on content/subject matter
- Avoid superlatives
- Point out hidden assumptions, biases, and unspoken insights that readers would overlook but experts would notice

**Description Writing Style by Type:**
- **Academic/scholarly:** Focus on thesis, scope, and methodology
- **Popular science** (Roach, Gladwell, Bryson): Emphasize topic + unique approach or angle
- **Memoir:** Central narrative arc or defining theme
- **Technical/Programming:** Problem addressed and solution methodology
- **Biography:** Subject's significance and time period covered
- **History:** Time period, geography, and central events/themes
- **Self-Help:** Core problem solved and approach taken

**Language guidelines:**
- **Minimize weak verbs:** "explores," "examines," "discusses" (overused)
- **Prefer active, specific verbs:** "chronicles," "analyzes," "reveals," "traces," "investigates"
- **Lead with substance:** Start with the actual subject, not meta-description
- **Example transformations:**
  - ❌ "Explores the history of money in America"
  - ✅ "Chronicles how central banks create money and shape economic policy"

### Step 6: Quality Checks

**Before finalizing:**
- [ ] All required fields populated
- [ ] **Cover image VISUALLY VERIFIED to match book title and author**
- [ ] Cover URL tested and working (not 404 or placeholder)
- [ ] Cover shows correct book (not different edition, collected works, or wrong title)
- [ ] Date format consistent with existing entries
- [ ] Category matches established categories
- [ ] Description is concise and informative
- [ ] No trailing commas in JSON
- [ ] Valid JSON syntax
- [ ] dateAdded is current date
- [ ] Ratings/links functional (if provided)
- [ ] ISBN matches the specific edition being cataloged

**CRITICAL VERIFICATION:**
- **If you cannot visually verify the cover matches:** DO NOT include cover URL
- **Wrong cover = failed entry** - Proceed without cover rather than with wrong cover
- **When uncertain:** State "Cover image could not be verified" and provide ISBN for manual check

---

## Example Execution

**User Input:**
```
add new book, title: The Power of Money
```

**Assistant Process:**
1. Search for book details (author, ISBN, publication date)
2. Find Paul Sheard as author, 2023 publication
3. Source cover from multiple options:
   - Check Syndetics with ISBN
   - Verify Open Library
   - Test image loading
4. Write concise description about money creation and central banking
5. Classify as "Economics" category
6. Set dateAdded to current date
7. Format as JSON entry
8. Validate JSON syntax
9. Present to user for confirmation

**Output:**
```json
{
  "title": "The Power of Money",
  "author": "Paul Sheard",
  "category": "Economics",
  "mediaType": "book",
  "description": "An exploration of how money works in the modern economy, examining the role of central banks and the creation of money.",
  "date": "2023",
  "genre": "Non-fiction, Economics, Finance",
  "titleColor": "#ffffff",
  "tag": "",
  "thumbs": "",
  "cover": "https://m.media-amazon.com/images/I/71e4QkucfaL._SL1500_.jpg",
  "amazon": "",
  "goodreads": "",
  "embedUrl": "",
  "ratings": {
    "gr": {
      "score": "",
      "url": ""
    },
    "amz": {
      "score": "",
      "url": ""
    }
  },
  "dateAdded": "2025-10-14"
}
```

---

## Special Cases

### Books without ISBN
- Use Open Library search by title/author
- Check Goodreads for cover images
- Fall back to Wikipedia if available

### International/Foreign Language Media
- Include language in description or tag
- Use original title with English subtitle if applicable
- Source covers from international databases

### Self-Published/Indie Content
- May require direct contact for cover permissions
- Document source of cover image
- Note availability limitations in description

### Podcasts/Episodes
- Use show artwork for cover
- Link to specific episode when applicable
- Include multiple platform links (Apple, Spotify, YouTube)

### Playlists
- Use consistent cover image (e.g., "images/listen.png" for monthly music playlists)
- Include platform-specific links (YouTube Music, Spotify)
- Description often empty for thematic collections
- Follow naming convention like "MonthCara" for monthly releases
- mediaType: "playlist"
- Icon: "fas fa-podcast" (consistent with audio content)

---

## Maintenance Notes

**Periodic reviews:**
- Check for broken cover image links quarterly
- Update ratings if significantly changed
- Verify external links remain functional
- Add new categories as needed

**Version control:**
- Maintain backup before bulk updates
- Document category additions
- Track template changes

---

## Error Handling

**If YouTube trailer/embed unavailable:**
1. For movies with unavailable YouTube trailers, set `"embedUrl": ""` (empty string)
2. Trailer is optional - presence of cover and metadata is sufficient
3. Check alternative trailer sources (IMDB, Rotten Tomatoes) but do not embed
4. Reference existing movie entries for best practices (e.g., "All We Imagine as Light", "Presence", "The Bare Necessity")

**If cover image unavailable:**
1. Try all sources listed in priority order
2. **Visually verify each source** - ensure title/author match
3. Cross-reference with Amazon, Goodreads, publisher site
4. Document inability to find verified hotlinkable cover
5. **Proceed without cover rather than with wrong cover**
6. Note in response: "Cover image could not be verified - ISBN provided for manual verification"

**If cover image MISMATCH detected:**
1. **STOP immediately** - do not use mismatched cover
2. Document the mismatch (e.g., "Syndetics ISBN shows 'Collected Writings' but book is 'Common Sense'")
3. Try alternate ISBN sources
4. Verify ISBN accuracy against multiple retailers
5. Check if ISBN was reused or references different edition
6. If no verified match found, leave cover field empty
7. Alert user to the issue and provide ISBN for manual check

**Common cover mismatch causes:**
- ISBN reuse by publisher
- Wrong edition (hardcover ISBN used for paperback search)
- Similar titles by same author
- Collected works vs. individual titles
- Regional edition differences (UK vs US covers)
- Out-of-print editions with substitute covers

**If critical metadata missing:**
- Explicitly note what's missing
- Provide partial entry with gaps identified
- Offer to research further if user provides more context

**If duplicate entry suspected:**
- Check existing entries by title
- Verify author/date to confirm uniqueness
- Alert user to potential duplicate
- Add edition info if different version

---

## Consistency Requirements

**Mandatory consistency:**
- Date formats must match existing patterns
- Categories must be from established list
- JSON syntax must be valid
- Cover URLs must be tested and working
- All entries must have dateAdded

**Style consistency:**
- Use double quotes in JSON
- No trailing commas
- Consistent indentation (2 spaces)
- Empty strings for unused fields, not null
- Arrays for multiple values (links, genres)

---

## User Confirmation

**Always present:**
1. Complete JSON entry
2. Cover image preview (mention if visible)
3. Request confirmation before adding to file
4. Offer to adjust any fields
5. Validate one final time before insertion

**Sample confirmation:**
```
I've prepared the following entry for "The Power of Money" by Paul Sheard:
- Category: Economics
- Cover: Found high-quality Amazon image
- Description: Concise summary of money creation and central banking
- Date added: 2025-10-14

Would you like me to proceed with adding this to media.json, or would you like to adjust any fields?
```

---

## Post Integration (Optional)

If the user requests to post in a `article/posts/YYYY-MM-DD.md` announcment in `index.html`:

1. **Add section to relevant post:** Create a new "## New Book/Movie/etc.: [Title]" section in the current day's post (e.g., `article/posts/YYYY-MM-DD.md`)
2. **Include thumbnail:** Add cover image floated to the right with border styling
3. **Add brief description:** Concise summary matching the media.json entry
4. **Include media link:** Add link to `media.html` with custom icon if available (e.g., `images/media.png`)
5. **Follow post formatting:** Use existing HTML structure with `<p class="section-links">` and `<div style="clear: both;"></div>`

**Example post addition:**
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

## Lessons Learned & Process Improvements

### Recent Execution (Land Power by Michael Albertus, 2025)

**Successful elements:**
- Used web_search for initial metadata gathering (effective for new releases)
- Publisher direct cover URL worked reliably (add to priority list as tested method)
- Browser tools enabled verification of image URLs without visual access
- Post integration added value for immediate visibility

**Improvements implemented:**
- **Verification protocol:** When visual verification isn't possible (AI context), use browser navigation to confirm URL loads and matches context (publisher site confirmation)
- **Cover sourcing:** Prioritize publisher's official image uploads for new releases (e.g., WordPress uploads on publisher sites)
- **Post updates:** Added optional workflow for announcment mentions to increase engagement
- **Date consistency:** Ensured dateAdded uses current date (2025-11-06) in ISO format

**Potential future enhancements:**
- Integrate Goodreads/Amazon ratings automatically via API
- Add batch post updates for multiple entries
- Implement image download for local hosting if hotlinking becomes unreliable
- Expand category validation against existing entries to prevent inconsistencies