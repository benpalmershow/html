I'm not here. Jackson. Mr Guitard on Knox paper. I. Daddy. Daddy. Daddy. **** **** Daddy, you saw that? Yeah. Here you can get some medication. Yes. #!/usr/bin/env node

/**
 * Automated Movie Addition Script for media.json
 * Fetches movie data from cinemeta/IMDB endpoints, parses TMDB/RT for poster/score,
 * validates structure, checks duplicates, and inserts atomically.
 * Usage: node scripts/add-movie.js <IMDB_ID or IMDB_URL>
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const MEDIA_JSON_PATH = path.join(__dirname, '../json/media.json');

// Helper: Fetch JSON from URL
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

// Helper: Fetch HTML from URL
function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Extract IMDb ID from URL or bare ID
function extractImdbId(input) {
  const match = input.match(/tt\d+/);
  if (!match) throw new Error('Invalid IMDb ID or URL. Must contain tt followed by digits.');
  return match[0];
}

// Check for duplicate movie by title
function checkDuplicate(title) {
  const media = JSON.parse(fs.readFileSync(MEDIA_JSON_PATH, 'utf8'));
  const duplicate = media.find(entry => 
    entry.mediaType === 'movie' && entry.title.toLowerCase() === title.toLowerCase()
  );
  if (duplicate) {
    throw new Error(`Duplicate movie found: "${title}" already exists in media.json`);
  }
}

// Extract TMDB poster URL from HTML
function extractTmdbPoster(html, moviedbId) {
  // Look for poster image URLs in the HTML - handle both markdown and HTML formats
  const patterns = [
    /\[.*?\]\(https:\/\/image\.tmdb\.org\/t\/p\/original\/([a-zA-Z0-9_\-]+\.jpg)\)/g,
    /\[.*?\]\(https:\/\/image\.tmdb\.org\/t\/p\/w500\/([a-zA-Z0-9_\-]+\.jpg)\)/g,
    /https:\/\/image\.tmdb\.org\/t\/p\/original\/([a-zA-Z0-9_\-]+\.jpg)/g,
    /https:\/\/image\.tmdb\.org\/t\/p\/w500\/([a-zA-Z0-9_\-]+\.jpg)/g,
    /"poster_path":"\/([a-zA-Z0-9_\-]+\.jpg)"/g,
    /src="https:\/\/image\.tmdb\.org\/t\/p\/w500\/([a-zA-Z0-9_\-]+\.jpg)"/g,
    /src="https:\/\/image\.tmdb\.org\/t\/p\/original\/([a-zA-Z0-9_\-]+\.jpg)"/g
  ];
  
  for (const pattern of patterns) {
    const matches = [...html.matchAll(pattern)];
    if (matches.length > 0) {
      // Return the first match as w500 size
      const hash = matches[0][1] || matches[0][0].split('/').pop();
      return `https://image.tmdb.org/t/p/w500/${hash}`;
    }
  }
  
  throw new Error('Could not extract poster URL from TMDB page');
}

// Extract Rotten Tomatoes score from HTML
function extractRtScore(html) {
  // Look for Tomatometer score patterns
  const patterns = [
    /tomatoes\.score\s*=\s*(\d+)/,
    /"score":\s*(\d+)%/,
    /<span[^>]*score-board[^>]*>(\d+)%<\/span>/,
    /tomatometer-score[^>]*>(\d+)/
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return match[1] + '%';
    }
  }
  
  return ''; // Score not found
}

// Validate entry structure against template
function validateEntry(entry) {
  const requiredFields = [
    'title', 'author', 'mediaType', 'description', 'date', 'genre',
    'titleColor', 'tag', 'thumbs', 'cover', 'imdb', 'embedUrl',
    'ratings', 'links', 'dateAdded'
  ];
  
  const missing = requiredFields.filter(field => !(field in entry));
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
  
  // Validate ratings structure
  if (!entry.ratings.imdb || !entry.ratings.imdb.score) {
    throw new Error('Missing IMDb rating in ratings.imdb.score');
  }
  
  // Validate links array
  if (!Array.isArray(entry.links) || entry.links.length === 0) {
    throw new Error('links must be a non-empty array');
  }
  
  // Validate mediaType
  if (entry.mediaType !== 'movie') {
    throw new Error('mediaType must be "movie"');
  }
  
  return true;
}

// Generate today's date in YYYY-MM-DD format
function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Construct embed URL from YouTube ID
function constructEmbedUrl(ytId) {
  if (!ytId) return '';
  return `https://www.youtube.com/embed/${ytId}`;
}

// Main function
async function addMovie(imdbInput) {
  try {
    console.log(`🎬 Adding movie: ${imdbInput}`);
    
    // Extract IMDb ID
    const imdbId = extractImdbId(imdbInput);
    console.log(`📋 IMDb ID: ${imdbId}`);
    
    // Fetch from cinemeta
    console.log(`📡 Fetching from cinemeta...`);
    const cinemetaData = await fetchJson(`https://v3-cinemeta.strem.io/meta/movie/${imdbId}.json`);
    const meta = cinemetaData.meta;
    
    if (!meta) {
      throw new Error('No metadata found from cinemeta');
    }
    
    // Fetch from IMDB suggestion for moviedb_id
    console.log(`📡 Fetching from IMDB suggestion...`);
    const imdbSuggestion = await fetchJson(`https://v3.sg.media-imdb.com/suggestion/t/${imdbId}.json`);
    const moviedbId = meta.moviedb_id || (imdbSuggestion.d && imdbSuggestion.d[0] && imdbSuggestion.d[0].id);
    
    if (!moviedbId) {
      throw new Error('Could not find moviedb_id');
    }
    
    console.log(`🎭 Title: ${meta.name}`);
    console.log(`👤 Director: ${meta.director ? meta.director[0] : 'Unknown'}`);
    console.log(`📅 Year: ${meta.year}`);
    console.log(`🎬 Genre: ${meta.genre ? meta.genre.join(', ') : 'Unknown'}`);
    console.log(`⭐ IMDb Rating: ${meta.imdbRating}`);
    console.log(`🆔 TMDB ID: ${moviedbId}`);
    
    // Check for duplicate
    console.log(`🔍 Checking for duplicates...`);
    checkDuplicate(meta.name);
    
    // Fetch TMDB posters page for poster
    console.log(`🖼️  Fetching poster from TMDB...`);
    let posterUrl = '';
    try {
      const tmdbSlug = meta.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
      const tmdbPostersUrl = `https://www.themoviedb.org/movie/${moviedbId}-${tmdbSlug}/images/posters`;
      const tmdbHtml = await fetchHtml(tmdbPostersUrl);
      posterUrl = extractTmdbPoster(tmdbHtml, moviedbId);
      console.log(`🖼️  Poster: ${posterUrl}`);
    } catch (e) {
      console.log(`⚠️  Could not extract poster from TMDB: ${e.message}`);
      // Fallback to cinemeta poster or ask user
      posterUrl = meta.poster || '';
      if (!posterUrl) {
        throw new Error('Poster URL required. Please provide it manually or fix TMDB parsing.');
      }
    }
    
    // Fetch Rotten Tomatoes for score
    console.log(`🍅 Fetching Rotten Tomatoes score...`);
    const rtSlug = meta.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_');
    const rtUrl = `https://www.rottentomatoes.com/m/${rtSlug}`;
    let rtScore = '';
    let rtPageExists = false;
    try {
      const rtHtml = await fetchHtml(rtUrl);
      rtScore = extractRtScore(rtHtml);
      rtPageExists = true;
      console.log(`🍅 RT Score: ${rtScore || 'Not available'}`);
    } catch (e) {
      console.log(`⚠️  Rotten Tomatoes page not found or inaccessible`);
    }
    
    // Extract YouTube trailer ID
    const ytId = meta.trailerStreams && meta.trailerStreams[0] ? meta.trailerStreams[0].ytId : '';
    const embedUrl = constructEmbedUrl(ytId);
    console.log(`🎥 Trailer: ${ytId ? `https://www.youtube.com/watch?v=${ytId}` : 'Not available'}`);
    
    // Build entry
    console.log(`📝 Building entry...`);
    const entry = {
      title: meta.name,
      author: meta.director ? meta.director[0] : 'Unknown',
      mediaType: 'movie',
      description: meta.description || '',
      date: meta.year.toString(),
      genre: meta.genre ? meta.genre.join(', ') : '',
      titleColor: '#ffffff',
      tag: '',
      thumbs: '',
      cover: posterUrl,
      imdb: `https://www.imdb.com/title/${imdbId}/`,
      rottenTomatoes: rtPageExists ? rtUrl : '',
      embedUrl: embedUrl,
      ratings: {
        rt: {
          score: rtScore,
          url: rtPageExists ? rtUrl : ''
        },
        imdb: {
          score: meta.imdbRating || '',
          url: `https://www.imdb.com/title/${imdbId}/`
        }
      },
      links: [{
        label: 'Trailer',
        icon: 'fab fa-youtube',
        url: ytId ? `https://www.youtube.com/watch?v=${ytId}` : ''
      }],
      dateAdded: getTodayDate()
    };
    
    // Validate entry
    console.log(`✅ Validating entry structure...`);
    validateEntry(entry);
    
    // Present for confirmation
    console.log(`\n📋 Entry to be added:\n`);
    console.log(JSON.stringify(entry, null, 2));
    console.log(`\n`);
    
    // Insert atomically
    console.log(`💾 Inserting into media.json...`);
    const media = JSON.parse(fs.readFileSync(MEDIA_JSON_PATH, 'utf8'));
    media.push(entry);
    fs.writeFileSync(MEDIA_JSON_PATH, JSON.stringify(media, null, 2) + '\n', 'utf8');
    
    // Validate JSON
    console.log(`✅ Validating media.json...`);
    JSON.parse(fs.readFileSync(MEDIA_JSON_PATH, 'utf8'));
    
    console.log(`\n✅ Successfully added "${meta.name}" to media.json`);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run script
const imdbInput = process.argv[2];
if (!imdbInput) {
  console.error('Usage: node scripts/add-movie.js <IMDB_ID or IMDB_URL>');
  console.error('Example: node scripts/add-movie.js tt28291010');
  console.error('Example: node scripts/add-movie.js https://www.imdb.com/title/tt28291010/');
  process.exit(1);
}

addMovie(imdbInput);
