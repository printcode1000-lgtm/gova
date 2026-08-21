export type PageSaveScopeId = string;

export const PAGE_SAVE_PENDING_SCHEMA_VERSION = 1 as const;

export interface PageSaveItemState {
  id: string;
  label: string;
  description?: string;
  isDirty: boolean;
  canSave: boolean;
  selected: boolean;
}

export type PageSaveItemInput = Omit<PageSaveItemState, "selected">;

export interface PageSaveHandle {
  save: (selectedItemIds: string[]) => Promise<boolean>;
  prepareForSave?: (selectedItemIds: string[]) => Promise<boolean>;
}

export interface PageSaveRegistrationInput {
  id: PageSaveScopeId;
  label: string;
  returnPath: string;
  items: PageSaveItemInput[];
  isSaving: boolean;
  canSave: boolean;
  handle: PageSaveHandle;
}

export type PageSavePhase = "idle" | "dirty" | "saving";

export interface PageSaveDialogState {
  registrationId: PageSaveScopeId;
  pageLabel: string;
  returnPath: string;
  items: PageSaveItemState[];
  isSaving: boolean;
  canSave: boolean;
  requiresNavigation: boolean;
}

export interface PageSaveSnapshot {
  phase: PageSavePhase;
  isDirty: boolean;
  isSaving: boolean;
  canSave: boolean;
  label: string | null;
  registrationId: PageSaveScopeId | null;
  hasPersistedPending: boolean;
  dialogOpen: boolean;
  dialog: PageSaveDialogState | null;
}

export type PageSaveStatusPatch = Pick<
  PageSaveRegistrationInput,
  "label" | "returnPath" | "items" | "isSaving" | "canSave"
>;

export interface PageSavePendingRecord {
  schemaVersion: typeof PAGE_SAVE_PENDING_SCHEMA_VERSION;
  id: PageSaveScopeId;
  pageLabel: string;
  returnPath: string;
  items: PageSaveItemState[];
  updatedAt: string;
}

export interface PageSaveStoragePort {
  getPending(id: PageSaveScopeId): Promise<PageSavePendingRecord | undefined>;
  setPending(record: PageSavePendingRecord): Promise<void>;
  deletePending(id: PageSaveScopeId): Promise<void>;
  listPending(): Promise<PageSavePendingRecord[]>;
}

export interface PageSaveRuntimeConfig {
  storage: PageSaveStoragePort;
}
