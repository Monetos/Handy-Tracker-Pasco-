// Offline-Cache: immer zuerst frisch aus dem Netz (damit Updates sofort ankommen), ohne Netz aus dem Cache.
const CACHE = 'handy-tracker-v2';
const FILES = ['./', 'index.html', 'buch.js', 'version.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const big = url.pathname.includes('/vendor/');   // große Texterkennungs-Dateien: Cache zuerst
  const net = () => fetch(e.request, big ? {} : { cache: 'no-cache' }).then(r => {
    if (r.ok && !url.search) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return r;
  });
  const cached = () => caches.match(e.request, { ignoreSearch: true });
  e.respondWith(big ? cached().then(r => r || net()) : net().catch(() => cached().then(r => r || caches.match('index.html'))));
});
