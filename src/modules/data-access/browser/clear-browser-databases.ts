'use client';

/** Deletes every IndexedDB database exposed by the current browser origin. */
export async function clearBrowserDatabases(): Promise<void> {
  if (typeof window === 'undefined' || !window.indexedDB?.databases) return;

  const databases = await window.indexedDB.databases();
  await Promise.all(
    databases.map(
      (database) =>
        new Promise<void>((resolve) => {
          if (!database.name) {
            resolve();
            return;
          }
          const request = window.indexedDB.deleteDatabase(database.name);
          request.onsuccess = () => resolve();
          request.onerror = () => resolve();
          request.onblocked = () => resolve();
        }),
    ),
  );
}
