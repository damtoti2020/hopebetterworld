/* Service worker : le site reste consultable hors connexion une fois visité. */
const CACHE = 'hbw-v2';
const SHELL = [
  './', 'index.html', 'css/style.css', 'js/app.js', 'js/admin.js', 'js/data.js', 'js/ui.js', 'js/statuts.js', 'js/vendor/lucide.min.js',
  'img/logo.jpg', 'img/icon-192.png', 'manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

/* Réseau d'abord (contenu toujours à jour), cache en secours. */
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))),
  );
});
