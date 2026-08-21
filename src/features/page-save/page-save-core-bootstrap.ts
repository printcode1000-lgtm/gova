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
        const rows = await asolDbGetAll<{
          key: string;
          value: import('@asol/page-save-core').PageSavePendingRecord;
        }>(ASOL_DB_STORES.PAGE_SAVE_PENDING);
        return rows.map((row) => row.value);
      },
    },
  });
}

export { hydratePageSavePendingFromStorage };
