import * as React from 'react';

import type {
  PageSnapshotIdentity,
  PageSnapshotOptions,
  PageSnapshotRecord,
} from '../../domain/page-snapshot.types';

export interface SnapshotRegistryEntry<T = unknown> {
  get: () => T;
  set: (value: T) => void;
}

export interface SnapshotContextValue {
  registerState: <T>(key: string, entry: SnapshotRegistryEntry<T>) => () => void;
  getIdentity: (options?: PageSnapshotOptions) => PageSnapshotIdentity;
  requestSave: () => void;
  lastSnapshot: PageSnapshotRecord | null;
}

export const SnapshotContext = React.createContext<SnapshotContextValue | null>(null);

export const DEFAULT_DEBOUNCE_MS = 600;
export const DEFAULT_RESTORE_DELAY_MS = 80;
