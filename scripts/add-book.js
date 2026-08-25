#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

const MEDIA_JSON_PATH = path.join(__dirname, '../json/media.json');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { followRedirect: true }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, (res2) => {
          let data = '';
          res2.on('data', chunk => data += chunk);
          res2.on('end', () => {
            try { resolve(JSON.parse(data)); }
            catch (e) { reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`)); }
          });
        }).on('error', reject);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { followRedirect: true }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, (res2) => {
          let data = '';
          res2.on('data', chunk => data += chunk);
          res2.on('end', () => resolve(data));
        }).on('error', reject);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function extractIsbn(input) {
  const cleaned = input.replace(/[-\s]/g, '');
  const match = cleaned.match(/(\d{10}|\d{13})/);
  if (!match) throw new Error('Invalid ISBN. Must be 10 or 13 digits.');
  return match[1];
}

function extractOlId(input) {
  const match = input.match(/OL\d+[A-Z]?\d+/);
  if (!match) return null;
  return match[0];
}

function checkDuplicate(title) {
  const media = JSON.parse(fs.readFileSync(MEDIA_JSON_PATH, 'utf8'));
  const duplicate = media.find(entry =>
    entry.mediaType === 'book' && entry.title.toLowerCase() === title.toLowerCase()
  );
  if (duplicate) {
    throw new Error(`Duplicate book found: "${title}" already exists in media.json`);
  }
}

function validateEntry(entry) {
  const requiredFields = [
    'title', 'author', 'mediaType', 'description', 'date', 'genre',
    'titleColor', 'tag', 'thumbs', 'cover', 'isbn', 'links', 'dateAdded'
  ];
  
  const missing = requiredFields.filter(field => !(field in entry));
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
  
  if (entry.mediaType !== 'book') {
    throw new Error('mediaType must be "book"');
  }
  
  if (!Array.isArray(entry.links) || entry.links.length === 0) {
    throw new Error('links must be a non-empty array');
  }
  
  return true;
}

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function addBook(input) {
  try {
    console.log(`Adding book: ${input}`);
    
    let olId = extractOlId(input);
    let isbn = extractIsbn(input);
    
    let bookData = null;
    let coverUrl = '';
    
    if (olId) {
      console.log(`Fetching Open Library data for ${olId}...`);
      bookData = await fetchJson(`https://openlibrary.org${olId}.json`);
    } else {
      console.log(`Fetching Open Library data for ISBN ${isbn}...`);
      try {
        bookData = await fetchJson(`https://openlibrary.org/isbn/${isbn}.json`);
      } catch (e) {
        console.log('ISBN lookup failed, trying search...');
        const searchResults = await fetchJson(`https://openlibrary.org/search.json?q=${encodeURIComponent(input)}`);
        if (searchResults.docs && searchResults.docs.length > 0) {
          const first = searchResults.docs[0];
          olId = first.key.replace('/works/', '').replace('/books/', '');
          if (!olId.startsWith('OL')) olId = first.key;
          bookData = await fetchJson(`https://openlibrary.org${olId}.json`);
        }
      }
    }
    
    if (!bookData) {
      throw new Error('Could not find book data on Open Library');
    }
    
    const title = bookData.title || 'Unknown Title';
    console.log(`Title: ${title}`);
    
    const authorKey = bookData.authors && bookData.authors[0] ? bookData.authors[0].key : null;
    let authorName = 'Unknown Author';
    if (authorKey) {
      try {
        const authorData = await fetchJson(`https://openlibrary.org${authorKey}.json`);
        authorName = authorData.name || 'Unknown Author';
      } catch (e) {
        console.log('Could not fetch author name');
      }
    }
    console.log(`Author: ${authorName}`);
    
    const publishDate = bookData.publish_date || '';
    console.log(`Published: ${publishDate}`);
    
    const description = bookData.description || '';
    const cleanDescription = typeof description === 'string' ? description : (description.value || '');
    console.log(`Description: ${cleanDescription.substring(0, 100)}...`);
    
    if (isbn) {
      try {
        const coverData = await fetchJson(`https://openlibrary.org/isbn/${isbn}.json`);
        const covers = coverData.covers || [];
        if (covers.length > 0) {
          coverUrl = `https://covers.openlibrary.org/b/id/${covers[0]}-L.jpg`;
        }
      } catch (e) {
        console.log('Could not fetch cover');
      }
    }
    
    if (!coverUrl && bookData.covers && bookData.covers.length > 0) {
      coverUrl = `https://covers.openlibrary.org/b/id/${bookData.covers[0]}-L.jpg`;
    }
    
    const entry = {
      title: title,
      author: authorName,
      mediaType: 'book',
      description: cleanDescription || '',
      date: publishDate.toString(),
      genre: (bookData.subjects || []).slice(0, 3).join(', ') || '',
      titleColor: '#ffffff',
      tag: '',
      thumbs: '',
      cover: coverUrl,
      isbn: isbn || '',
      links: [
        {
          label: 'Open Library',
          icon: 'fas fa-book',
          url: `https://openlibrary.org${olId || bookData.key}`
        }
      ],
      dateAdded: getTodayDate()
    };
    
    console.log('\nEntry to be added:');
    console.log(JSON.stringify(entry, null, 2));
    
    checkDuplicate(title);
    validateEntry(entry);
    
    console.log('\nInserting into media.json...');
    const media = JSON.parse(fs.readFileSync(MEDIA_JSON_PATH, 'utf8'));
    media.push(entry);
    fs.writeFileSync(MEDIA_JSON_PATH, JSON.stringify(media, null, 2) + '\n', 'utf8');
    
    JSON.parse(fs.readFileSync(MEDIA_JSON_PATH, 'utf8'));
    
    console.log(`\nSuccessfully added "${title}" to media.json`);
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

const input = process.argv[2];
if (!input) {
  console.error('Usage: node scripts/add-book.js <ISBN | OpenLibrary_ID | title>');
  console.error('Example: node scripts/add-book.js 9780140283297');
  console.error('Example: node scripts/add-book.js OL7353617W');
  console.error('Example: node scripts/add-book.js "The Name of the Rose"');
  process.exit(1);
}

addBook(input);
