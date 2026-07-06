'use client';

import { govaDbClearAll } from '@/lib/gova-db';
import { clearStoredThemePreferences } from '@/theme/runtime';

import { clearStoredAppPreferences } from '@/lib/preferences';

export function calculateLocalStorageSize(): number {
  if (typeof window === 'undefined' || !window.localStorage) return 0;

  let totalSize = 0;
  for (const key in localStorage) {
    if (!Object.prototype.hasOwnProperty.call(localStorage, key)) continue;
    try {
      const value = localStorage.getItem(key) ?? '';
      totalSize += (key.length + value.length) * 2;
    } catch {
      // ignore
    }
  }
  return totalSize;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 ب';
  const k = 1024;
  const sizes = ['ب', 'ك.ب', 'م.ب', 'ج.ب'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

function clearLocalStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  localStorage.clear();
}

function clearCookies(): void {
  if (typeof document === 'undefined') return;
  const cookies = document.cookie.split('; ');
  for (const cookie of cookies) {
    const eqPos = cookie.indexOf('=');
    const name = eqPos > -1 ? cookie.slice(0, eqPos) : cookie;
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  }
}

async function clearIndexedDbDatabases(): Promise<void> {
  if (typeof window === 'undefined' || !window.indexedDB?.databases) return;
  const dbs = await window.indexedDB.databases();
  await Promise.all(
    dbs.map(
      (db) =>
        new Promise<void>((resolve) => {
          if (!db.name) {
            resolve();
            return;
          }
          const request = window.indexedDB.deleteDatabase(db.name);
          request.onsuccess = () => resolve();
          request.onerror = () => resolve();
          request.onblocked = () => resolve();
        }),
    ),
  );
}

export const CLEAR_STORAGE_WARNING =
  'سيتم مسح كل التخزين المحلي (localStorage، ملفات تعريف الارتباط، وقاعدة GovaDB بما فيها جلسة الضيف وبيانات الإعداد). سيتم إعادة تحميل الصفحة. هل تريد المتابعة؟';

export async function clearAllClientStorage(): Promise<void> {
  clearStoredThemePreferences();
  clearStoredAppPreferences();
  clearLocalStorage();
  clearCookies();
  await govaDbClearAll();
  await clearIndexedDbDatabases();
}
