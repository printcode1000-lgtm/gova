'use client';

import {
  ASOL_DB_STORES,
  asolDbDelete,
  asolDbGet,
  asolDbGetAll,
  asolDbSet,
} from '@asol/data-core/browser';
import {
  clearAllPageSaveOperations,
  clearPageSavePersistence,
  clearPageSaveRegistry,
  configurePageSaveCore,
  hydratePageSavePendingFromStorage,
  hydratePageSaveRecoveryFromStorage,
  type PageSaveJournalEntry,
} from '@asol/page-save-core';
import { clearPageSaveImageUploadHandles } from '../infrastructure/runtime/page-save-image-upload-registry';

let registered = false;

export function registerPageSaveCorePorts(): void {
  if (registered) return;
  registered = true;

  configurePageSaveCore({
    storage: {
      getPending: async (id) =>
        (await asolDbGet(ASOL_DB_STORES.PAGE_SAVE_PENDING, id)) ?? undefined,
      setPending: (record) =>
        asolDbSet(ASOL_DB_STORES.PAGE_SAVE_PENDING, record.id, record),
      deletePending: (id) => asolDbDelete(ASOL_DB_STORES.PAGE_SAVE_PENDING, id),
      listPending: async () => {
        const rows = await asolDbGetAll<
          import('@asol/page-save-core').PageSavePendingRecord
        >(ASOL_DB_STORES.PAGE_SAVE_PENDING);
        return rows.map((row) => row.value);
      },
      getJournalEntry: async (operationId) =>
        (await asolDbGet<PageSaveJournalEntry>(
          ASOL_DB_STORES.PAGE_SAVE_JOURNAL,
          operationId,
        )) ?? undefined,
      setJournalEntry: (entry) =>
        asolDbSet(ASOL_DB_STORES.PAGE_SAVE_JOURNAL, entry.operationId, entry),
      deleteJournalEntry: (operationId) =>
        asolDbDelete(ASOL_DB_STORES.PAGE_SAVE_JOURNAL, operationId),
      listJournalEntries: async () => {
        const rows = await asolDbGetAll<PageSaveJournalEntry>(
          ASOL_DB_STORES.PAGE_SAVE_JOURNAL,
        );
        return rows.map((row) => row.value);
      },
    },
  });
}

export { hydratePageSavePendingFromStorage, hydratePageSaveRecoveryFromStorage };

/** Clears every page-save trace owned by the current signed-in user. */
export async function clearPageSaveClientState(): Promise<void> {
  // Hide the header affordance immediately, then remove staged and durable work.
  clearPageSaveRegistry();
  clearAllPageSaveOperations();
  clearPageSaveImageUploadHandles();
  await clearPageSavePersistence();
}
