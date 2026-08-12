'use client';

import {
  asolDbClearAll,
  clearBrowserDatabases,
} from '@/modules/data-access/browser';

function clearCookies(): void {
  if (typeof document === 'undefined') return;
  const cookies = document.cookie.split('; ');
  for (const cookie of cookies) {
    const eqPos = cookie.indexOf('=');
    const name = eqPos > -1 ? cookie.slice(0, eqPos) : cookie;
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  }
}

function clearWebStorage(): void {
  if (typeof window === 'undefined') return;

  try {
    // Cleanup-only legacy compatibility: the application never writes notification data here.
    // eslint-disable-next-line no-restricted-properties
    window.localStorage?.clear();
  } catch {
    // Ignore restricted storage errors and continue clearing the rest.
  }

  try {
    window.sessionStorage?.clear();
  } catch {
    // Ignore restricted storage errors and continue clearing the rest.
  }
}

async function clearCacheStorage(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return;

  try {
    const names = await window.caches.keys();
    await Promise.all(names.map((name) => window.caches.delete(name)));
  } catch {
    // Cache Storage may be blocked in some runtimes; reset should still continue.
  }
}

export const CLEAR_STORAGE_WARNING =
  'سيتم إلغاء اشتراك إشعارات هذا الجهاز وحذف رمزه من الخادم، ثم مسح كل البيانات المحلية وإعادة الإعدادات الافتراضية وتحميل الصفحة من جديد. هل تريد المتابعة؟';

export async function clearAllClientStorage(): Promise<void> {
  clearCookies();
  clearWebStorage();
  await asolDbClearAll();
  await clearBrowserDatabases();
  await clearCacheStorage();
}
