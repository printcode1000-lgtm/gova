'use client';

import {
  ASOL_DB_STORES,
  asolDbDelete,
  asolDbGet,
  asolDbGetAll,
  asolDbSet,
} from '@asol/data-core/browser';
import {
  configurePageSaveCore,
  hydratePageSavePendingFromStorage,
  hydratePageSaveRecoveryFromStorage,
  type PageSaveJournalEntry,
} from '@asol/page-save-core';

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
