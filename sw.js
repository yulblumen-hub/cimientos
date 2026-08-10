/* Cimientos — service worker
   Cachea el caparazón para que la app abra al instante y offline.
   Los datos viven en localStorage, así que no hay nada de red que sincronizar. */

const CACHE = 'cimientos-v1';
const ARCHIVOS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', ev => {
  ev.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ARCHIVOS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Red primero, caché como red de contención. Así un deploy nuevo se ve
// enseguida, pero sin internet la app sigue abriendo.
self.addEventListener('fetch', ev => {
  if (ev.request.method !== 'GET') return;
  ev.respondWith(
    fetch(ev.request)
      .then(res => {
        const copia = res.clone();
        caches.open(CACHE).then(c => c.put(ev.request, copia)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(ev.request).then(r => r || caches.match('./index.html')))
  );
});

// Al tocar la notificación, abrir la app (o traer al frente la que ya está).
self.addEventListener('notificationclick', ev => {
  ev.notification.close();
  ev.waitUntil(
    self.clients.matchAll({ type:'window', includeUncontrolled:true }).then(cs => {
      for (const c of cs){ if ('focus' in c) return c.focus(); }
      return self.clients.openWindow('./index.html');
    })
  );
});
