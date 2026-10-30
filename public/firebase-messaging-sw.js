// Firebase Messaging Service Worker for background push notifications
/* eslint-disable no-restricted-globals */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

const recentMessageIds = [];

self.addEventListener('push', (event) => {
  let data = {};
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    data = {
      title: 'Sami',
      body: event.data ? event.data.text() : 'وصلتك رسالة جديدة',
    };
  }

  const payloadData = (data && typeof data.data === 'object' && data.data) ? data.data : data;
  const messageId = payloadData && payloadData.messageId ? String(payloadData.messageId) : '';

  if (messageId) {
    if (recentMessageIds.includes(messageId)) {
      return;
    }
    recentMessageIds.push(messageId);
    if (recentMessageIds.length > 60) {
      recentMessageIds.shift();
    }
  }

  const title =
    payloadData.title ||
    data.title ||
    (data.notification && data.notification.title) ||
    'Sami';
  const body =
    payloadData.body ||
    data.body ||
    (data.notification && data.notification.body) ||
    'وصلتك رسالة جديدة';

  const options = {
    body,
    icon: payloadData.icon || data.icon || '/icon-192.png',
    badge: '/favicon.png',
    vibrate: [200, 100, 200],
    data: {
      chatType: payloadData.chatType || 'channel',
      channelId: payloadData.channelId || '',
      partnerId: payloadData.partnerId ? Number(payloadData.partnerId) || payloadData.partnerId : '',
      senderId: payloadData.senderId ? Number(payloadData.senderId) || payloadData.senderId : '',
      messageId,
      fromNotification: true,
    },
    tag: messageId ? `sami-msg-${messageId}` : (data.tag || `sami-msg-${Date.now()}`),
    renotify: !messageId,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  const deepLinkParam = encodeURIComponent(JSON.stringify(notifData));
  const targetUrl = `/?sami_deeplink=${deepLinkParam}`;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus().then(() => {
            client.postMessage({
              type: 'app_open_chat_message',
              detail: notifData,
            });
          });
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
