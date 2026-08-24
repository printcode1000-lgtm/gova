'use client';

export {
  SnapshotProvider,
  usePageSnapshot,
  useSnapshotState,
} from './presentation/hooks/use-page-snapshot';
export {
  applySnapshotToDom,
  captureSnapshot,
  cleanupExpiredSnapshots,
  clearSnapshots,
  createPageSnapshotKey,
  deleteSnapshot,
  hasSnapshot,
  pauseSnapshot,
  persistSnapshot,
  restoreSnapshot,
  resumeSnapshot,
  saveSnapshot,
} from './application/services/page-snapshot-service';
export type {
  PageSnapshotIdentity,
  PageSnapshotOptions,
  PageSnapshotRecord,
} from './domain/page-snapshot.types';

/* BEGIN GENERATED FEATURE DOOR EXPORTS */
/** Auto-maintained sealed-door re-exports. Do not edit by hand. */
export * from './application/services/page-snapshot-service';
/* END GENERATED FEATURE DOOR EXPORTS */
