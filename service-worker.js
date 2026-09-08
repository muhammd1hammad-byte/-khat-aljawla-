// Service Worker بسيط لتطبيق "خط الجولة" — يخزّن الملفات الأساسية مؤقتاً (cache)
// عند أول تحميل، ليعمل التطبيق دون اتصال بالإنترنت لاحقاً قدر الإمكان. يستخدم
// أسلوباً مختلطاً: شبكة أولاً لملف index.html (لضمان وصول أي تحديث فوراً)،
// وكاش أولاً للملفات الثابتة (الأيقونات) التي لا تتغيّر عادةً.
//
// !! تنبيه لأي تعديل مستقبلي !!
// ارفع رقم النسخة في CACHE_NAME مع كل تحديث فعلي تنشره، وإلا فبعض الأجهزة قد
// تستمر بعرض نسخة قديمة مخزَّنة محلياً.
const CACHE_NAME = 'khat-aljawla-cache-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch(() => { /* تجاهل بأمان إن تعذّر تخزين أحد الملفات مؤقتاً */ })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // فقط طلبات GET من نفس الأصل؛ أي طلب آخر (خرائط، Firebase، مكتبة Leaflet)
  // يُترك ليمر عبر الشبكة مباشرة دون تدخل من الكاش
  if (event.request.method !== 'GET') return;

  const isHtmlNavigation = event.request.mode === 'navigate'
    || (event.request.headers.get('accept') || '').includes('text/html');

  if (isHtmlNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
