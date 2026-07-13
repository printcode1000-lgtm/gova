'use client';

import type { StateStorage } from 'zustand/middleware';
import { trackGovaDbOp } from '@/core/monitor/gova-db-monitor';

const DB_NAME = 'GovaDB';
const DB_VERSION = 6;

export const GOVA_DB_STORES = {
  GUEST_SESSIONS: 'guestSessions',
  APP_SETTINGS: 'appSettings',
  AUTH: 'auth',
  SELLER_ONBOARDING: 'sellerOnboarding',
  QUERY_CACHE: 'queryCache',
  NOTIFICATIONS: 'notifications',
  NOTIFICATION_DEVICE_TOKENS: 'notificationDeviceTokens',
  NOTIFICATION_SETTINGS: 'notificationSettings',
  NOTIFICATION_BADGES: 'notificationBadges',
  NOTIFICATION_ANALYTICS: 'notificationAnalytics',
  NOTIFICATION_OFFLINE_QUEUE: 'notificationOfflineQueue',
  PAGE_SNAPSHOTS: 'pageSnapshots',
} as const;

export type GovaDbStoreName = (typeof GOVA_DB_STORES)[keyof typeof GOVA_DB_STORES];

/** IndexedDB only accepts structured-cloneable data — strip Promises/functions via JSON. */
function toStorableValue<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (value instanceof Promise) {
    throw new Error('GovaDB: cannot store a Promise in IndexedDB');
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

let dbInstance: IDBDatabase | null = null;

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;
  if (!hasIndexedDb()) {
    throw new Error('GovaDB IndexedDB storage is only available in the browser');
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const idb = (event.target as IDBOpenDBRequest).result;

      for (const storeName of Object.values(GOVA_DB_STORES)) {
        if (!idb.objectStoreNames.contains(storeName)) {
          idb.createObjectStore(storeName, { keyPath: 'key' });
        }
      }
    };
  });
}

async function getStore(
  storeName: GovaDbStoreName,
  mode: 'readonly' | 'readwrite' = 'readonly',
): Promise<IDBObjectStore> {
  const db = await getDB();
  const transaction = db.transaction(storeName, mode);
  return transaction.objectStore(storeName);
}

async function idbRequestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function govaDbGet<T>(storeName: GovaDbStoreName, key: string): Promise<T | null> {
  if (!hasIndexedDb()) return null;
  return trackGovaDbOp(storeName, key, 'get', async () => {
    const db = await getDB();
    return new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const row = request.result as { key: string; value: T } | undefined;
        resolve(row?.value ?? null);
      };
      tx.onerror = () => reject(tx.error);
    });
  });
}

export async function govaDbSet<T>(storeName: GovaDbStoreName, key: string, value: T): Promise<void> {
  if (!hasIndexedDb()) return;
  const storable = toStorableValue(value);
  return trackGovaDbOp(storeName, key, 'set', async () => {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put({ key, value: storable });
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  });
}

export async function govaDbDelete(storeName: GovaDbStoreName, key: string): Promise<void> {
  if (!hasIndexedDb()) return;
  return trackGovaDbOp(storeName, key, 'delete', async () => {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(key);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  });
}

export async function govaDbGetAll<T>(storeName: GovaDbStoreName): Promise<Array<{ key: string; value: T }>> {
  if (!hasIndexedDb()) return [];
  return trackGovaDbOp(storeName, '*', 'get', async () => {
    const db = await getDB();
    return new Promise<Array<{ key: string; value: T }>>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve((request.result as Array<{ key: string; value: T }> | undefined) ?? []);
      };
      tx.onerror = () => reject(tx.error);
    });
  });
}

export async function govaDbClearStore(storeName: GovaDbStoreName): Promise<void> {
  if (!hasIndexedDb()) return;
  return trackGovaDbOp(storeName, '*', 'clear', async () => {
    const store = await getStore(storeName, 'readwrite');
    await idbRequestToPromise(store.clear());
  });
}

export async function govaDbClearAll(): Promise<void> {
  if (!hasIndexedDb()) return;
  await getDB();
  for (const storeName of Object.values(GOVA_DB_STORES)) {
    await govaDbClearStore(storeName);
  }
}

const GUEST_SESSION_KEY = 'current';

export interface GuestSessionData {
  id: string;
  createdAt: string;
}

export async function govaDbGetGuestSession(): Promise<GuestSessionData | null> {
  return govaDbGet<GuestSessionData>(GOVA_DB_STORES.GUEST_SESSIONS, GUEST_SESSION_KEY);
}

export async function govaDbSetGuestSession(session: GuestSessionData): Promise<void> {
  return govaDbSet<GuestSessionData>(GOVA_DB_STORES.GUEST_SESSIONS, GUEST_SESSION_KEY, session);
}

export async function govaDbDeleteGuestSession(): Promise<void> {
  return govaDbDelete(GOVA_DB_STORES.GUEST_SESSIONS, GUEST_SESSION_KEY);
}

export interface AuthData {
  authToken?: string;
}

const AUTH_KEY = 'auth';
const CURRENT_SESSION_KEY = 'current';

export async function govaDbGetAuth(): Promise<AuthData> {
  return (await govaDbGet<AuthData>(GOVA_DB_STORES.AUTH, AUTH_KEY)) ?? {};
}

export async function govaDbSetAuth(data: Partial<AuthData>): Promise<void> {
  const current = await govaDbGetAuth();
  return govaDbSet<AuthData>(GOVA_DB_STORES.AUTH, AUTH_KEY, {
    ...current,
    ...data,
  });
}

/** Remove legacy auth token row (key: auth). */
export async function govaDbDeleteAuthLegacy(): Promise<void> {
  return govaDbDelete(GOVA_DB_STORES.AUTH, AUTH_KEY);
}

export async function govaDbGetCurrentSession<T>(): Promise<T | null> {
  return govaDbGet<T>(GOVA_DB_STORES.AUTH, CURRENT_SESSION_KEY);
}

export async function govaDbSetCurrentSession<T>(session: T): Promise<void> {
  return govaDbSet<T>(GOVA_DB_STORES.AUTH, CURRENT_SESSION_KEY, session);
}

export async function govaDbDeleteCurrentSession(): Promise<void> {
  return govaDbDelete(GOVA_DB_STORES.AUTH, CURRENT_SESSION_KEY);
}

export function createGovaDbZustandStorage(storeName: GovaDbStoreName): StateStorage {
  return {
    getItem: async (name) => {
      const val = await govaDbGet<string>(storeName, name);
      return val ?? null;
    },
    setItem: async (name, value) => {
      await govaDbSet<string>(storeName, name, value);
    },
    removeItem: async (name) => {
      await govaDbDelete(storeName, name);
    },
  };
}
