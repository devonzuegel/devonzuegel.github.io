// Deliberately cache no private cards, answers, sessions, or API responses.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data?.json() || {}; } catch {}
  event.waitUntil(self.registration.showNotification(payload.title || 'Time for a little practice', {
    body:payload.body || 'Your cards are ready to review.', icon:'/remember/icon-192.png', badge:'/remember/icon-192.png',
    tag:'cards-reminder', data:{ url:'/remember/' },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type:'window', includeUncontrolled:true });
    const existing = windows.find(w=>new URL(w.url).origin === self.location.origin && new URL(w.url).pathname.startsWith('/remember/'));
    if (existing) return existing.focus();
    return self.clients.openWindow('/remember/');
  })());
});
