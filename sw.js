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

if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
  self.addEventListener('fetch', event => {
    event.respondWith(fetch(event.request));
  });
} else {
  self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    if (!url.protocol.startsWith('http')) {
      return;
    }

    if (event.request.url.match(/\.(js|html)$/i)) {
      event.respondWith(
        fetch(event.request, { cache: 'no-store' })
          .then(response => {
            if (response && response.status === 200 && response.type !== 'error') {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            return caches.match(event.request).then(response => {
              if (response) return response;
              throw new Error('Network failure and no cache available');
            });
          })
      );
      return;
    }

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
            .catch(() => {
              return new Response('Image fetch failed', { status: 404, statusText: 'Not Found' });
            });
        });
      })
    );
  });
}

function getOptimizedImageUrl(originalUrl) {
  return originalUrl;
}
