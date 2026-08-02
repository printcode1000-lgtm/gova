'use client';

export const PAGE_SNAPSHOT_VERSION = 1;

export interface PageSnapshotIdentity {
  userId: string;
  route: string;
  pathname: string;
  params?: Record<string, string | string[]>;
  query?: Record<string, string | string[]>;
}

export interface PageSnapshotScroll {
  x: number;
  y: number;
  elements: Record<string, { x: number; y: number }>;
}

export interface PageSnapshotFormField {
  selector: string;
  value: string | boolean | string[];
  kind: 'input' | 'textarea' | 'select';
}

export interface PageSnapshotRecord {
  key: string;
  userId: string;
  route: string;
  pathname: string;
  params: Record<string, string | string[]>;
  query: Record<string, string | string[]>;
  scroll: PageSnapshotScroll;
  focusedElement: string | null;
  activeTab: string | null;
  accordions: Record<string, boolean>;
  selectedItems: string[];
  filters: Record<string, unknown>;
  searchText: string | null;
  sortOptions: Record<string, unknown>;
  pagination: Record<string, unknown>;
  infiniteScroll: Record<string, unknown>;
  expandedSections: Record<string, boolean>;
  formValues: PageSnapshotFormField[];
  unsavedDraftData: Record<string, unknown>;
  uiState: Record<string, unknown>;
  componentState: Record<string, unknown>;
  routeParameters: Record<string, string | string[]>;
  queryParameters: Record<string, string | string[]>;
  loadedDataCacheRefs: string[];
  timestamp: number;
  expiresAt: number;
  snapshotVersion: number;
  appBuildId: string;
}

export interface SavePageSnapshotInput extends PageSnapshotIdentity {
  ttlMs?: number;
  partial?: Partial<
    Pick<
      PageSnapshotRecord,
      | 'activeTab'
      | 'accordions'
      | 'selectedItems'
      | 'filters'
      | 'searchText'
      | 'sortOptions'
      | 'pagination'
      | 'infiniteScroll'
      | 'expandedSections'
      | 'unsavedDraftData'
      | 'uiState'
      | 'componentState'
      | 'loadedDataCacheRefs'
    >
  >;
}

export interface RestorePageSnapshotInput extends PageSnapshotIdentity {
  expectedVersion?: number;
}

export interface PageSnapshotOptions {
  enabled?: boolean;
  ttlMs?: number;
  restoreWhen?: boolean;
  namespace?: string;
  debounceMs?: number;
}
