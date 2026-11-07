/* Service worker: caches the whole app so it works fully offline once installed. */
const CACHE = 'mots-v4';
const ASSETS = [
  './', './index.html', './manifest.json', './css/styles.css', './icons/icon.svg',
  './js/core/util.js', './js/core/storage.js', './js/core/audio-store.js',
  './js/data/builtin-vocab.js', './js/data/grammar.js',
  './js/services/srs.js', './js/models/vocab.js', './js/services/native-audio.js', './js/services/recorder.js', './js/services/audio.js', './js/services/questions.js',
  './js/services/stats.js', './js/services/session.js', './js/services/reminders.js', './js/services/io.js',
  './js/ui/components.js',
  './js/views/home.js', './js/views/vocab.js', './js/views/practice.js', './js/views/grammar.js',
  './js/views/progress.js', './js/views/settings.js', './js/app.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()));
});

// Network first (so updates arrive), falling back to the cache when offline.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'))));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window' }).then((clients) => {
    if (clients.length) return clients[0].focus();
    return self.clients.openWindow('./index.html');
  }));
});
