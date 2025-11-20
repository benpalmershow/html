const CACHE_NAME = 'media-cache-v3';
const EXTERNAL_DOMAINS = [
  'upload.wikimedia.org',
  'photos.airmail.news',
  'cdn2.wwnorton.com',
  'ia600100.us.archive.org',
  'ia800505.us.archive.org',
  'ia801909.us.archive.org',
  'ia804605.us.archive.org',
  'ia600404.us.archive.org',
  'ia600505.us.archive.org',
  'ia801705.us.archive.org',
  'ia600202.us.archive.org',
  'ia600603.us.archive.org',
  'ia601705.us.archive.org',
  'ia800202.us.archive.org',
  'ia801405.us.archive.org',
  'ia801909.us.archive.org',
  'ia800100.us.archive.org',
  'ia600100.us.archive.org',
  'ia902800.us.archive.org',
  'ia902902.us.archive.org',
  'ia803405.us.archive.org',
  'ia804602.us.archive.org',
  'ia801404.us.archive.org',
  'ia801406.us.archive.org',
  'ia802301.us.archive.org',
  'ia600604.us.archive.org',
  'covers.openlibrary.org',
  'yt3.googleusercontent.com',
  'i.ytimg.com',
  'img.youtube.com',
  'pics.filmaffinity.com',
  'assets.tuckercarlson.com',
  'hardlystrictlybluegrass.com',
  'hachettebookgroup.com'
];

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => clients.claim())
  );
});

// Helper to create optimized response via image proxy
function getOptimizedImageUrl(originalUrl) {
  // Use Imgproxy format: https://docs.imgproxy.net/
  // Or Cloudflare Image Optimization: ?format=webp&fit=scale-down&width=1024
  // For now, just use the original since we can't control external image servers
  return originalUrl;
}

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Always fetch fresh JS and HTML from network
  if (event.request.url.match(/\.(js|html)$/i)) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          // Update cache with fresh version
          if (response && response.status === 200 && response.type !== 'error') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache
          return caches.match(event.request).then(response => {
            if (response) return response;
            // If not in cache and network failed, throw to let browser handle failure
            // instead of returning undefined which causes TypeError
            throw new Error('Network failure and no cache available');
          });
        })
    );
    return;
  }
  
  // Only cache external image/media requests
  const isExternalDomain = EXTERNAL_DOMAINS.some(domain => url.hostname.includes(domain));
  if (!isExternalDomain || !event.request.url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(response => {
        if (response) {
          return response;
        }
        
        return fetch(event.request, { credentials: 'omit' })
          .then(response => {
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }
            
            const responseClone = response.clone();
            cache.put(event.request, responseClone);
            return response;
          })
          .catch(err => {
            // Return a 404 so the img tag receives an error and triggers onerror
            return new Response('Image fetch failed', { status: 404, statusText: 'Not Found' });
          });
      });
    })
  );
});
