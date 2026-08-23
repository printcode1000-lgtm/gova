'use client';

import { publicEnv } from '@/core/config/public-env';
import {
  ASOL_DB_STORES,
  asolDbClearStore,
  asolDbDelete,
  asolDbGet,
  asolDbGetAll,
  asolDbSet,
} from '@asol/data-core/browser';
import {
  applySnapshotToDom,
  captureSnapshot,
  clearSnapshots,
  cleanupExpiredSnapshots,
  configurePageSnapshotCore,
  createPageSnapshotKey,
  deleteSnapshot,
  hasSnapshot,
  pauseSnapshot,
  persistSnapshot,
  restoreSnapshot,
  resumeSnapshot,
  saveSnapshot,
} from '@asol/page-snapshot-core';

let registered = false;

export function registerPageSnapshotCorePorts(): void {
  if (registered) return;
  registered = true;

  configurePageSnapshotCore({
    appBuildId: publicEnv.buildId,
    storage: {
      get: async (key) =>
        (await asolDbGet(ASOL_DB_STORES.PAGE_SNAPSHOTS, key)) ?? undefined,
      set: (key, value) => asolDbSet(ASOL_DB_STORES.PAGE_SNAPSHOTS, key, value),
      delete: (key) => asolDbDelete(ASOL_DB_STORES.PAGE_SNAPSHOTS, key),
      clear: () => asolDbClearStore(ASOL_DB_STORES.PAGE_SNAPSHOTS),
      getAll: () => asolDbGetAll(ASOL_DB_STORES.PAGE_SNAPSHOTS),
    },
  });
}

export {
  applySnapshotToDom,
  captureSnapshot,
  clearSnapshots,
  cleanupExpiredSnapshots,
  createPageSnapshotKey,
  deleteSnapshot,
  hasSnapshot,
  pauseSnapshot,
  persistSnapshot,
  restoreSnapshot,
  resumeSnapshot,
  saveSnapshot,
};
