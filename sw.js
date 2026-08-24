// 수능 섬 서비스 워커
// 역할: (1) 오프라인에서도 앱이 열리도록 캐싱  (2) 앱이 열려 있는 동안 페이지가 보내는
//       알림 요청을 받아 화면에 띄움  (3) 알림을 탭하면 앱 창으로 포커스 이동
const CACHE_NAME = 'suneung-island-v1';
const APP_SHELL = [
  './',
  './suneung-island.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 오프라인 폴백: 캐시 우선, 없으면 네트워크
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).catch(() => cached))
  );
});

// 메인 페이지가 postMessage로 알림을 요청하면 여기서 실제로 띄움.
// (서비스 워커를 통해 띄우면 페이지가 백그라운드 탭이어도 조금 더 안정적으로 표시됨)
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'SHOW_NOTIFICATION') return;
  const { title, body, tag } = data.payload || {};
  self.registration.showNotification(title || '수능 섬', {
    body: body || '',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: tag || 'suneung-reminder',
    renotify: true,
    vibrate: [80, 40, 80]
  });
});

// 알림을 탭하면 이미 열린 앱 창이 있으면 포커스, 없으면 새로 염
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('./suneung-island.html');
    })
  );
});
