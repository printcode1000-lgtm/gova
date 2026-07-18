'use client';

import type { StateStorage } from 'zustand/middleware';
import { trackAsolDbOp } from '@/core/monitor/asol-db-monitor';

const DB_NAME = 'AsolDB';
const DB_VERSION = 8;

export const ASOL_DB_STORES = {
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
  FAVORITES: 'favorites',
  CART: 'cart',
} as const;

export type AsolDbStoreName = (typeof ASOL_DB_STORES)[keyof typeof ASOL_DB_STORES];

/** IndexedDB only accepts structured-cloneable data — strip Promises/functions via JSON. */
function toStorableValue<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (value instanceof Promise) {
    throw new Error('AsolDB: cannot store a Promise in IndexedDB');
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
    throw new Error('AsolDB IndexedDB storage is only available in the browser');
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

      for (const storeName of Object.values(ASOL_DB_STORES)) {
        if (!idb.objectStoreNames.contains(storeName)) {
          idb.createObjectStore(storeName, { keyPath: 'key' });
        }
      }
    };
  });
}

async function getStore(
  storeName: AsolDbStoreName,
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

export async function asolDbGet<T>(storeName: AsolDbStoreName, key: string): Promise<T | null> {
  if (!hasIndexedDb()) return null;
  return trackAsolDbOp(storeName, key, 'get', async () => {
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

export async function asolDbSet<T>(storeName: AsolDbStoreName, key: string, value: T): Promise<void> {
  if (!hasIndexedDb()) return;
  const storable = toStorableValue(value);
  return trackAsolDbOp(storeName, key, 'set', async () => {
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

export async function asolDbDelete(storeName: AsolDbStoreName, key: string): Promise<void> {
  if (!hasIndexedDb()) return;
  return trackAsolDbOp(storeName, key, 'delete', async () => {
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

export async function asolDbGetAll<T>(storeName: AsolDbStoreName): Promise<Array<{ key: string; value: T }>> {
  if (!hasIndexedDb()) return [];
  return trackAsolDbOp(storeName, '*', 'get', async () => {
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

export async function asolDbClearStore(storeName: AsolDbStoreName): Promise<void> {
  if (!hasIndexedDb()) return;
  return trackAsolDbOp(storeName, '*', 'clear', async () => {
    const store = await getStore(storeName, 'readwrite');
    await idbRequestToPromise(store.clear());
  });
}

export async function asolDbClearAll(): Promise<void> {
  if (!hasIndexedDb()) return;
  await getDB();
  for (const storeName of Object.values(ASOL_DB_STORES)) {
    await asolDbClearStore(storeName);
  }
}

const GUEST_SESSION_KEY = 'current';

export interface GuestSessionData {
  id: string;
  createdAt: string;
}

export async function asolDbGetGuestSession(): Promise<GuestSessionData | null> {
  return asolDbGet<GuestSessionData>(ASOL_DB_STORES.GUEST_SESSIONS, GUEST_SESSION_KEY);
}

export async function asolDbSetGuestSession(session: GuestSessionData): Promise<void> {
  return asolDbSet<GuestSessionData>(ASOL_DB_STORES.GUEST_SESSIONS, GUEST_SESSION_KEY, session);
}

export async function asolDbDeleteGuestSession(): Promise<void> {
  return asolDbDelete(ASOL_DB_STORES.GUEST_SESSIONS, GUEST_SESSION_KEY);
}

export interface AuthData {
  authToken?: string;
}

const AUTH_KEY = 'auth';
const CURRENT_SESSION_KEY = 'current';

export async function asolDbGetAuth(): Promise<AuthData> {
  return (await asolDbGet<AuthData>(ASOL_DB_STORES.AUTH, AUTH_KEY)) ?? {};
}

export async function asolDbSetAuth(data: Partial<AuthData>): Promise<void> {
  const current = await asolDbGetAuth();
  return asolDbSet<AuthData>(ASOL_DB_STORES.AUTH, AUTH_KEY, {
    ...current,
    ...data,
  });
}

/** Remove legacy auth token row (key: auth). */
export async function asolDbDeleteAuthLegacy(): Promise<void> {
  return asolDbDelete(ASOL_DB_STORES.AUTH, AUTH_KEY);
}

export async function asolDbGetCurrentSession<T>(): Promise<T | null> {
  return asolDbGet<T>(ASOL_DB_STORES.AUTH, CURRENT_SESSION_KEY);
}

export async function asolDbSetCurrentSession<T>(session: T): Promise<void> {
  return asolDbSet<T>(ASOL_DB_STORES.AUTH, CURRENT_SESSION_KEY, session);
}

export async function asolDbDeleteCurrentSession(): Promise<void> {
  return asolDbDelete(ASOL_DB_STORES.AUTH, CURRENT_SESSION_KEY);
}

export function createAsolDbZustandStorage(storeName: AsolDbStoreName): StateStorage {
  return {
    getItem: async (name) => {
      const val = await asolDbGet<string>(storeName, name);
      return val ?? null;
    },
    setItem: async (name, value) => {
      await asolDbSet<string>(storeName, name, value);
    },
    removeItem: async (name) => {
      await asolDbDelete(storeName, name);
    },
  };
}
