/* EMBER service worker — offline shell + install-to-home-screen.
   Network-first so a fresh deploy always wins when online, with the cache as
   an offline fallback. Bump CACHE when the strategy changes. */
const CACHE = 'ember-v2';
const ASSETS = [
  '.', 'index.html', 'style.css', 'game.js',
  'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Network-first: always try the live version, fall back to cache when offline.
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.ok && res.type === 'basic') {
        const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req).then(hit => hit || caches.match('index.html')))
  );
});
