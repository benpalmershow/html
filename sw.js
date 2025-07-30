const CACHE_NAME = 'howdy-stranger-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/news.html',
  '/media.html',
  '/journal.html',
  '/read.html',
  '/financials.html',
  '/css/body.min.css',
  '/css/media.min.css',
  '/css/news.min.css',
  '/css/financials.min.css',
  '/js/nav.min.js',
  '/js/media.min.js',
  '/js/journal-feed.min.js',
  '/js/post-feed.min.js',
  '/js/socials.min.js',
  '/js/portfolio.min.js',
  '/json/media.min.json',
  '/json/financials-data.min.json',
  '/json/journal.min.json',
  '/json/posts.min.json',
  '/images/logo.png',
  '/images/favicon.ico'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});