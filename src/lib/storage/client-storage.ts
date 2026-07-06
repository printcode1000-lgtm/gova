'use client';

import { govaDbClearAll } from '@/lib/gova-db';

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
  'سيتم مسح كل البيانات المحلية (ملفات تعريف الارتباط وقاعدة GovaDB بما فيها جلسة الضيف وبيانات الإعداد). سيتم إعادة تحميل الصفحة. هل تريد المتابعة؟';

export async function clearAllClientStorage(): Promise<void> {
  clearCookies();
  await govaDbClearAll();
  await clearIndexedDbDatabases();
}
