/* sw.js — Network-First مع Cache offline */
const CACHE = 'goldpro-v96';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './firebase.js',
  './app.js',
  './assistant.js',
  './inventory.js',
  './invoice.js',
  './raffinage.js',
  './auth.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/icon-180.png',
  './icons/icon-167.png',
  './icons/icon-152.png',
  './icons/icon-120.png',
  './icons/calc-192.png',
  './icons/calc-512.png',
  './icons/calc-180.png',
  './icons/calc-167.png',
  './icons/calc-152.png',
  './icons/calc-120.png',
];

/* تثبيت: حفظ الملفات الأساسية في الكاش */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* تفعيل: حذف كاشات قديمة */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* الطلبات: Network-First → إذا فشل الإنترنت يُقرأ من الكاش */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  /* فقط نفس النطاق (لا Firebase ولا CDN) */
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
