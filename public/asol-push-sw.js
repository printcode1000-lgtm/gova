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

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidPushPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  if (!hasText(payload.uid)) return false;
  return (
    hasText(payload.title) ||
    hasText(payload.body) ||
    hasText(payload.templateId) ||
    hasText(payload.notificationId)
  );
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
    metadata: {
      provider: 'web_push',
      ...(payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {}),
    },
  };
}

async function saveNotificationToCenter(payload) {
  if (!payload || !payload.uid || typeof indexedDB === 'undefined') return;
  const notification = toNotificationEntity(payload);
  const db = await openAsolDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(
      ['notifications', 'notificationBadges', 'notificationSettings'],
      'readwrite',
    );
    const notificationsStore = tx.objectStore('notifications');
    const badgesStore = tx.objectStore('notificationBadges');
    const settingsStore = tx.objectStore('notificationSettings');
    const listKey = `user:${notification.uid}:list`;
    const badgeKey = `user:${notification.uid}`;
    const dismissedKey = `user:${notification.uid}:dismissed`;

    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();

    Promise.all([
      getRow(notificationsStore, listKey),
      getRow(settingsStore, dismissedKey),
    ])
      .then(([row, dismissedRow]) => {
        const dismissed = Array.isArray(dismissedRow && dismissedRow.value)
          ? dismissedRow.value
          : [];
        if (
          dismissed.includes(notification.id) ||
          dismissed.includes(notification.dedupeKey)
        ) {
          return undefined;
        }
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

async function applySpecialtyChatReceipt(payload) {
  const metadata = payload && payload.metadata;
  if (!metadata || metadata.specialtyChatKind !== 'specialty_receipt' || !payload.uid) return false;
  const targetMessageId = String(metadata.targetMessageId || '');
  const status = metadata.receiptStatus;
  if (!targetMessageId || (status !== 'received' && status !== 'read')) return true;
  const db = await openAsolDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(['notifications'], 'readwrite');
    const store = tx.objectStore('notifications');
    const key = `user:${payload.uid}:list`;
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();
    getRow(store, key).then((row) => {
      const now = new Date().toISOString();
      const current = Array.isArray(row && row.value) ? row.value : [];
      const next = current.map((item) => {
        const itemMetadata = item.metadata || {};
        const matches = targetMessageId.startsWith('req_')
          ? item.id === targetMessageId || (itemMetadata.specialtyChatKind === 'specialty_request' && itemMetadata.requestId === targetMessageId)
          : item.id === targetMessageId || itemMetadata.messageId === targetMessageId;
        if (!matches || itemMetadata.outgoing !== true) return item;
        const receiptFromUid = String(metadata.receiptFromUid || '');
        const receivedBy = new Set(String(itemMetadata.remoteReceivedBy || '').split(',').filter(Boolean));
        const readBy = new Set(String(itemMetadata.remoteReadBy || '').split(',').filter(Boolean));
        if (receiptFromUid) receivedBy.add(receiptFromUid);
        if (status === 'read' && receiptFromUid) readBy.add(receiptFromUid);
        return {
          ...item,
          updatedAt: now,
          metadata: {
            ...itemMetadata,
            remoteReceivedAt: itemMetadata.remoteReceivedAt || now,
            remoteReceivedBy: [...receivedBy].join(','),
            remoteReceivedCount: receivedBy.size,
            ...(status === 'read'
              ? { remoteReadAt: now, remoteReadBy: [...readBy].join(','), remoteReadCount: readBy.size }
              : {}),
          },
        };
      });
      return putRow(store, key, next);
    }).catch(reject);
  });
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clients) client.postMessage({ type: ASOL_NOTIFICATION_CHANGED_EVENT, uid: payload.uid });
  return true;
}

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'ASOL', body: event.data ? event.data.text() : '' };
  }

  if (!isValidPushPayload(payload)) return;

  if (payload.metadata && payload.metadata.specialtyChatKind === 'specialty_receipt') {
    event.waitUntil(applySpecialtyChatReceipt(payload).catch(() => undefined));
    return;
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
