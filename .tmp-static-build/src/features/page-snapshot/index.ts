'use client';

export {
  SnapshotProvider,
  usePageSnapshot,
  useSnapshotState,
} from './hooks/use-page-snapshot';
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
} from './services/page-snapshot-service';
export type {
  PageSnapshotIdentity,
  PageSnapshotOptions,
  PageSnapshotRecord,
} from './entities/page-snapshot.types';
