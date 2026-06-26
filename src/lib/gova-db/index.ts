'use client';

import type { StateStorage } from 'zustand/middleware';

const DB_NAME = 'GovaDB';
const DB_VERSION = 4;

export const GOVA_DB_STORES = {
  GUEST_SESSIONS: 'guestSessions',
  APP_SETTINGS: 'appSettings',
  AUTH: 'auth',
  SELLER_ONBOARDING: 'sellerOnboarding',
  QUERY_CACHE: 'queryCache',
} as const;

export type GovaDbStoreName = (typeof GOVA_DB_STORES)[keyof typeof GOVA_DB_STORES];

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
  const store = await getStore(storeName, 'readonly');
  const result = await idbRequestToPromise<{ key: string; value: T } | undefined>(store.get(key));
  return result?.value ?? null;
}

export async function govaDbSet<T>(storeName: GovaDbStoreName, key: string, value: T): Promise<void> {
  if (!hasIndexedDb()) return;
  const store = await getStore(storeName, 'readwrite');
  await idbRequestToPromise(store.put({ key, value }));
}

export async function govaDbDelete(storeName: GovaDbStoreName, key: string): Promise<void> {
  if (!hasIndexedDb()) return;
  const store = await getStore(storeName, 'readwrite');
  await idbRequestToPromise(store.delete(key));
}

export async function govaDbClearStore(storeName: GovaDbStoreName): Promise<void> {
  if (!hasIndexedDb()) return;
  const store = await getStore(storeName, 'readwrite');
  await idbRequestToPromise(store.clear());
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
