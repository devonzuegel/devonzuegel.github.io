const SHELL_CACHE = 'meditation-shell-20260824040746';
const AUDIO_CACHE = 'meditation-audio-v1';
const SHELL_URLS = ['./', './index.html', './manifest.json'];

// Precache the app shell so the page itself opens with no network at all.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

// Drop old shell caches on activate. Never touch AUDIO_CACHE — that's the
// user's saved library and is managed explicitly by the page's own JS.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== SHELL_CACHE && key !== AUDIO_CACHE)
            .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if(req.method !== 'GET') return;

  const url = new URL(req.url);

  // Archive.org audio files: check the saved-audio cache first. If the user
  // saved this track for offline, it plays with zero network trip. Otherwise
  // fall through to a normal network fetch (e.g. live streaming during search).
  if(url.hostname.endsWith('archive.org') && /\.(mp3|ogg)$/i.test(url.pathname)){
    event.respondWith(
      caches.open(AUDIO_CACHE).then((cache) =>
        cache.match(req).then((cached) => cached || fetch(req))
      )
    );
    return;
  }

  // App shell (the page navigation itself, plus its own asset requests):
  // cache-first so the page loads with no connection.
  if(req.mode === 'navigate' || SHELL_URLS.some((path) => req.url.endsWith(path.replace('./', '')))){
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
  }

  // Everything else (search API calls, metadata lookups, fonts) goes straight
  // to the network as normal — those aren't meant to work offline.
});
