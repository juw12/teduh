// Offline support: the whole game is cached on first visit, then served cache-first.
// Bump VERSION on every release so players get the new files.

const VERSION = 'teduh-v1.0.0';
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css?v=1.0.0',
  'js/main.js?v=1.0.0',
  'js/data.js',
  'js/state.js',
  'js/i18n.js',
  'js/world.js',
  'js/ui.js',
  'js/audio.js',
  'js/net.js',
  'vendor/three.module.min.js',
  'vendor/trystero-nostr.js',
  'fonts/Fraunces.woff2',
  'fonts/Figtree.woff2',
  'assets/icon.svg',
  'assets/icon-192.png',
  'assets/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }
  event.respondWith(
    caches.match(request, { ignoreSearch: false }).then((hit) => hit || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(VERSION).then((cache) => cache.put(request, copy));
      }
      return response;
    }).catch(() => caches.match('index.html'))),
  );
});
