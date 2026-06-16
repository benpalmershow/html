# Media Addition Workflow

Standard procedure for adding media entries to `json/media.json`. All types share one file; `media.html` loads cards dynamically.

---

## `/add new movie, IMDB link [URL or ttID]`

**Automated workflow:** Use the `add-movie.js` script which handles all steps automatically.

```bash
node scripts/add-movie.js <IMDB_ID or IMDB_URL>
```

Examples:
```bash
node scripts/add-movie.js tt28291010
node scripts/add-movie.js https://www.imdb.com/title/tt28291010/
```

**The script automatically:**
- Fetches movie data from cinemeta and IMDB suggestion endpoints
- Parses TMDB posters page for poster URL (HTML extraction)
- Parses Rotten Tomatoes page for score (HTML extraction)
- Checks for duplicates by title
- Auto-generates `dateAdded` (today's date)
- Auto-constructs `embedUrl` from YouTube trailer ID
- Validates entry structure against required fields
- Inserts atomically using Node
- Validates resulting JSON
- Presents entry for confirmation before insertion

**Manual fallback (if script fails):**

Extract the IMDB ID, then run the movie pipeline below. No TMDB API key is ever available — use only the id-based endpoints listed.

---

## Fast Path: `new movie` (IMDB URL or bare ID)

Prompt forms accepted:

```
new movie, IMDB link https://www.imdb.com/title/tt0096163/
new movie https://www.imdb.com/title/tt8110652/
new movie, IMDb: tt11692284
```

**Pipeline — 7 steps to `media.json`:**

1. Resolve identity (no API key):
   - `https://v3-cinemeta.strem.io/meta/movie/[ID].json` → director, genre, year, rating, trailer, description
   - `https://v3.sg.media-imdb.com/suggestion/t/[ID].json` → `moviedb_id` for TMDB poster lookup
2. Poster (browser only — TMDB REST API returns 401):
   - Navigate `https://www.themoviedb.org/movie/[MOVIEDB_ID]-[slug]`
   - Inspect `<img src>` in the gallery to extract the CDN hash
   - Construct `https://media.themoviedb.org/t/p/w500/[hash].jpg` or `https://image.tmdb.org/t/p/w500/[hash].jpg`
   - Verify visually — title and director must be on the cover
3. Trailer:
   - `trailerStreams[0].ytId` → `https://www.youtube.com/embed/[ID]?si=[RANDOM]`
   - Verify by navigating `https://www.youtube.com/watch?v=[ID]` — title must match
   - If no trailer: `embedUrl: ""`, `links[0].url: ""`
   - Always supply a `links` array, empty URLs fine
4. Build entry (field order must match existing entries exactly):

```json
{
  "title": "[title]",
  "author": "[director]",
  "mediaType": "movie",
  "description": "[1-2 sentences, active verbs, factual]",
  "date": "YYYY",
  "genre": "[comma-separated]",
  "titleColor": "#ffffff",
  "tag": "",
  "thumbs": "",
  "cover": "[TMDB CDN URL]",
  "imdb": "https://www.imdb.com/title/[ID]/",
  "rottenTomatoes": "",
  "embedUrl": "[embed URL or \"\"]",
  "ratings": {
    "rt": {"score": "", "url": ""},
    "imdb": {"score": "[IMDB rating]", "url": "https://www.imdb.com/title/[ID]/"}
  },
  "links": [{"label": "Trailer", "icon": "fab fa-youtube", "url": "[watch URL or \"\"]"}],
  "dateAdded": "YYYY-MM-DD"
}
```

5. Atomic insertion (Node, never hand-edit 3,700 lines):

```bash
node -e "
const fs = require('fs');
const path = 'json/media.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
data.push(/* entry */);
fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
console.log('Inserted:', entry.title);
"
```

6. Post-insertion validation (must pass before reporting done):
   - `node -e "require('./json/media.json'); console.log('media.json is valid')"`
   - `python -m http.server 8000` → load `http://localhost:8000/media.html` → visually confirm card renders

7. Present JSON to user for confirmation before Step 5.

---

**Other triggers** (trigger the agent or follow the corresponding steps in `media_fetch.md`):

| Prompt | Target type |
|---|---|
| `add new book, title: X` or `add book: X` | Book |
| `add new podcast, title: X` | Podcast |
| `add new album, title: X` | Album |
| `add books: X, Y` (2+) | Batch |

---

## Consuming `media.json`

The movie template above is the *observed* shape in `media.json`. Other types use:

| Type | Key fields beyond title/author |
|---|---|
| Book | `category`, `amazon`, `goodreads`, `ratings.gr` |
| Podcast | `icon`, `links[]` (Apple/Spotify/YouTube), `url` |
| Album | `genre`, `links[]` (YouTube Music/Spotify) |
| Playlist | `icon: "fas fa-podcast"`, `cover: "images/listen.png"`, `links[]` |

---

## Cover Reliability Hierarchy (All Types)

| Tier | Source | When |
|---|---|---|
| ✅ Most | Syndetics/SFPL | Books, ISBN known |
| ✅ Most | Open Library | Books, archive-backed |
| ✅ Reliable | Internet Archive | Books / historical |
| ✅ Reliable | Publisher / Amazon / B&N | Books (stable URLs) |
| ⚠️ Medium | Google Books API | Books (may change) |
| ⚠️ Medium | TMDB CDN | Movies (browser only, no API key) |
| ❌ Avoid | Blog WordPress / query-param URLs | Any — temp/cache-busting |
| ❌ Avoid | `i0.wp.com`, `cdn.*.com/temp/` | Any |
| ❌ Avoid | Goodreads images | Frequently change |

**Red flags:** Any URL with `?resize=`, `?ssl=1`, `?v=`, or a `.wordpress.com` domain. Do not use.

 Cover verification (mandatory before writing to `media.json`):
 - URL returns 200, not 404
 - Image is the actual item, not a placeholder
 - Title on cover matches exactly; author/director matches
 - Edition matches (hardcover vs. paperback)
 - No similar-title confusion (collected works vs. single work)

If verification is impossible → leave `cover` blank with a note in the prompt. Wrong cover is a data-integrity failure.

---

### Local Image Hosting

When hotlinks are unreliable (403, CORS, recently broken), download, convert to WebP, and store locally:

```bash
ffmpeg -i cover.jpg -c:v libwebp images/media-title.webp
```

Update `"cover"` to `"images/media-title.webp"`. WebP cuts file size 30-40% vs. JPEG, no CORS issues.

---

### Error Handling

**TMDB / poster lookup** → ❌ Never call `api.themoviedb.org/3/…` — returns 401 without a live key. Navigate `www.themoviedb.org` in a browser, inspect the gallery, construct the CDN URL directly.

**IMDb direct fetch** → ❌ CloudFront WAF blocks `imdb.com/title/…` — use only `v3.sg.media-imdb.com` and `v3-cinemeta.strem.io` endpoints.

**Missing trailer** → `embedUrl: ""`, `links[0].url: ""`. Do not embed from RT or IMDb.

**Missing Rotten Tomatoes page** → `rottenTomatoes: ""`, `ratings.rt: {"score": "", "url": ""}`. Never guess URLs.

**Duplicate in media.json** → Check by title, alert user, do not insert.

---

## Consistency Requirements

- **Date formats:** Movies/books → `YYYY`; podcasts/playlists → `Month YYYY`; `dateAdded` → `YYYY-MM-DD` (always)
- **Categories:** Use established list only (Economics, Finance, History, Biography, Memoir, Political Science, Psychology, Technology, Health, Self-Help, Fiction, Poetry, Programming, Sociology, Urban Studies, Law, Travel, Gardening, Food & Drink, Business & Technology, Science, Philosophy, Children's, Literature, Investigative, True Crime, Education)
- **JSON:** Double quotes, no trailing commas, 2-space indent, empty strings not null
- **All entries:** Must have `dateAdded`

---

## Post Integration (Optional)

If creating a post in `article/posts/YYYY-MM-DD-slug.md`, embed like this (movie example):

```markdown
---
date: YYYY-MM-DDT12:00:00Z
---

<img src="[COVER_URL]" alt="[Title] cover" style="width: 100px; height: auto; float: right; margin-left: 10px; border: 2px solid #ddd; border-radius: 4px;">

Added "[Title]" by [Director] to the media collection. [1 sentence, matching media.json description.]

<p class="section-links">
<a href="media.html" title="View media collection"><img src="images/media.png" alt="Media" style="width: 1.2em; height: auto;"> Media</a>
</p>
<div style="clear: both;"></div>
```

Add to `json/posts.json` at **top** of array: `{ "date": "YYYY-MM-DDT12:00:00Z", "file": "article/posts/YYYY-MM-DD-slug.md" }`.

---

## Lessons Learned

| Error | Fix |
|---|---|
| WordPress/query-param hotlinks | Hard check domain type before testing |
| TMDB `www.` vs `media.` CDN domain | Always `media.themoviedb.org`, always `w500/` |
| Alternate / regional movie titles | Resolve canonical TMDB record first via IMDB → moviedb_id |
| IMDb page WAF block | Use only id-based endpoints (no `imdb.com/title/…` direct calls) |
| TMDB REST API 401 | Do not call `api.themoviedb.org` without a key; use browser gallery instead |
| Wrong trailer source | Verify YouTube title matches before using; leave empty if unverifiable |
