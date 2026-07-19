const ASOL_DB_NAME = 'AsolDB';
const ASOL_DB_VERSION = 8;
const ASOL_NOTIFICATION_STORES = [
  'guestSessions',
  'appSettings',
  'auth',
  'sellerOnboarding',
  'queryCache',
  'notifications',
  'notificationDeviceTokens',
  'notificationSettings',
  'notificationBadges',
  'notificationAnalytics',
  'notificationOfflineQueue',
  'pageSnapshots',
  'favorites',
  'cart',
];
const ASOL_NOTIFICATION_CHANGED_EVENT = 'asol:notifications:changed';

function openAsolDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(ASOL_DB_NAME, ASOL_DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const storeName of ASOL_NOTIFICATION_STORES) {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'key' });
        }
      }
    };
  });
}

function getRow(store, key) {
  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function putRow(store, key, value) {
  return new Promise((resolve, reject) => {
    const request = store.put({ key, value });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

function normalizeCategory(value) {
  return ['orders', 'chat', 'payment', 'offers', 'system'].includes(value)
    ? value
    : 'system';
}

function normalizePriority(value) {
  return ['low', 'normal', 'high', 'critical'].includes(value)
    ? value
    : 'normal';
}

function normalizeSound(value) {
  return ['default', 'silent', 'urgent'].includes(value) ? value : 'default';
}

function safeInternalRoute(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : undefined;
}

function toNotificationEntity(payload) {
  const now = new Date().toISOString();
  const id = payload.notificationId || `web_push_${Date.now()}`;
  const href = safeInternalRoute(payload.routeHref || payload.href);
  return {
    id,
    uid: payload.uid,
    type: payload.templateId ? 'template' : 'custom',
    source: payload.templateId ? 'template' : 'custom',
    templateId: payload.templateId || undefined,
    title: payload.title || 'ASOL',
    body: payload.body || '',
    category: normalizeCategory(payload.category),
    priority: normalizePriority(payload.priority),
    channels: ['in_app', 'web_push'],
    targets: ['center', 'badge'],
    route: href ? { href, label: payload.routeLabel || undefined } : undefined,
    groupKey: payload.groupKey || undefined,
    dedupeKey: payload.dedupeKey || id,
    sound: normalizeSound(payload.sound),
    status: 'delivered',
    syncState: 'synced',
    displayedAt: now,
    createdAt: payload.createdAt || now,
    updatedAt: now,
    metadata: { provider: 'web_push' },
  };
}

async function saveNotificationToCenter(payload) {
  if (!payload || !payload.uid || typeof indexedDB === 'undefined') return;
  const notification = toNotificationEntity(payload);
  const db = await openAsolDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(['notifications', 'notificationBadges'], 'readwrite');
    const notificationsStore = tx.objectStore('notifications');
    const badgesStore = tx.objectStore('notificationBadges');
    const listKey = `user:${notification.uid}:list`;
    const badgeKey = `user:${notification.uid}`;

    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();

    getRow(notificationsStore, listKey)
      .then((row) => {
        const current = Array.isArray(row && row.value) ? row.value : [];
        const exists = current.some((item) => item.dedupeKey === notification.dedupeKey);
        const next = exists ? current : [notification, ...current].slice(0, 250);
        return Promise.all([
          putRow(notificationsStore, listKey, next),
          putRow(badgesStore, badgeKey, {
            uid: notification.uid,
            unreadCount: next.filter((item) => !item.readAt).length,
            updatedAt: new Date().toISOString(),
          }),
        ]);
      })
      .catch(reject);
  });

  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage({
      type: ASOL_NOTIFICATION_CHANGED_EVENT,
      uid: notification.uid,
      notificationId: notification.id,
    });
  }
}

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'ASOL', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'ASOL';
  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.dedupeKey || payload.notificationId || 'asol-notification',
    data: {
      href: payload.href || '/notifications',
    },
  };

  event.waitUntil(
    Promise.all([
      saveNotificationToCenter(payload).catch(() => undefined),
      self.registration.showNotification(title, options),
    ]),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const href = event.notification.data && event.notification.data.href
    ? event.notification.data.href
    : '/notifications';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(href);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(href);
      return undefined;
    }),
  );
});
