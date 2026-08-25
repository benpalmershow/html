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

function checkDuplicate(title) {
  const media = JSON.parse(fs.readFileSync(MEDIA_JSON_PATH, 'utf8'));
  const duplicate = media.find(entry =>
    entry.mediaType === 'podcast' && entry.title.toLowerCase() === title.toLowerCase()
  );
  if (duplicate) {
    throw new Error(`Duplicate podcast found: "${title}" already exists in media.json`);
  }
}

function validateEntry(entry) {
  const requiredFields = [
    'title', 'author', 'mediaType', 'description', 'date', 'genre',
    'titleColor', 'tag', 'thumbs', 'cover', 'links', 'dateAdded'
  ];
  
  const missing = requiredFields.filter(field => !(field in entry));
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
  
  if (entry.mediaType !== 'podcast') {
    throw new Error('mediaType must be "podcast"');
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

async function searchiTunes(query) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=podcast&limit=5`;
  const data = await fetchJson(url);
  return data.results || [];
}

async function addPodcast(input) {
  try {
    console.log(`Adding podcast: ${input}`);
    
    let results = [];
    
    if (input.startsWith('http')) {
      const url = new URL(input);
      const idMatch = url.pathname.match(/id(\d+)/);
      if (idMatch) {
        const lookupUrl = `https://itunes.apple.com/lookup?id=${idMatch[1]}`;
        const data = await fetchJson(lookupUrl);
        results = data.results || [];
      }
    }
    
    if (results.length === 0) {
      console.log('Searching iTunes...');
      results = await searchiTunes(input);
    }
    
    if (results.length === 0) {
      throw new Error('No podcast found. Try a more specific search term or provide a direct iTunes URL.');
    }
    
    const podcast = results[0];
    console.log(`Title: ${podcast.collectionName}`);
    console.log(`Artist: ${podcast.artistName}`);
    console.log(`Feed: ${podcast.feedUrl}`);
    
    const coverUrl = podcast.artworkUrl600 || podcast.artworkUrl100 || '';
    const description = podcast.description || podcast.collectionExplicitness || '';
    
    const entry = {
      title: podcast.collectionName,
      author: podcast.artistName,
      mediaType: 'podcast',
      description: description,
      date: new Date(podcast.releaseDate).toISOString().split('T')[0] || '',
      genre: (podcast.genres || []).slice(0, 3).join(', ') || '',
      titleColor: '#ffffff',
      tag: '',
      thumbs: '',
      cover: coverUrl,
      feedUrl: podcast.feedUrl || '',
      links: [
        {
          label: 'Apple Podcasts',
          icon: 'fab fa-apple',
          url: podcast.collectionViewUrl || input
        }
      ],
      dateAdded: getTodayDate()
    };
    
    console.log('\nEntry to be added:');
    console.log(JSON.stringify(entry, null, 2));
    
    checkDuplicate(podcast.collectionName);
    validateEntry(entry);
    
    console.log('\nInserting into media.json...');
    const media = JSON.parse(fs.readFileSync(MEDIA_JSON_PATH, 'utf8'));
    media.push(entry);
    fs.writeFileSync(MEDIA_JSON_PATH, JSON.stringify(media, null, 2) + '\n', 'utf8');
    
    JSON.parse(fs.readFileSync(MEDIA_JSON_PATH, 'utf8'));
    
    console.log(`\nSuccessfully added "${podcast.collectionName}" to media.json`);
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

const input = process.argv[2];
if (!input) {
  console.error('Usage: node scripts/add-podcast.js <search term | iTunes URL>');
  console.error('Example: node scripts/add-podcast.js "The Joe Rogan Experience"');
  console.error('Example: node scripts/add-podcast.js "https://podcasts.apple.com/us/podcast/..."');
  process.exit(1);
}

addPodcast(input);
