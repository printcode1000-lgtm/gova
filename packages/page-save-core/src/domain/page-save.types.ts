import type { PageSaveOperationKind } from "./page-save-operation.types";
import type {
  PageSaveJournalEntry,
  PageSaveRecoveredOperation,
} from "./page-save-journal.types";

export type PageSaveScopeId = string;

export const PAGE_SAVE_PENDING_SCHEMA_VERSION = 1 as const;

export interface PageSaveItemState {
  id: string;
  label: string;
  description?: string;
  operation: PageSaveOperationKind;
  /**
   * True when the item's work lives only in memory (a staged operation holds a
   * closure). Such items drive the header while mounted but are never written
   * to the pending store, so a force-close cannot resurrect an unrunnable item.
   */
  ephemeral?: boolean;
  isDirty: boolean;
  canSave: boolean;
  selected: boolean;
}

export type PageSaveItemInput = Omit<
  PageSaveItemState,
  "selected" | "operation"
> & {
  operation?: PageSaveOperationKind;
};

export type PageSaveResult = "success" | "failure";

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
  lastResult: PageSaveResult | null;
  /** Operations a previous session left unfinished, awaiting the user's call. */
  interrupted: PageSaveRecoveredOperation[];
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
  getJournalEntry(operationId: string): Promise<PageSaveJournalEntry | undefined>;
  setJournalEntry(entry: PageSaveJournalEntry): Promise<void>;
  deleteJournalEntry(operationId: string): Promise<void>;
  listJournalEntries(): Promise<PageSaveJournalEntry[]>;
}

export interface PageSaveRuntimeConfig {
  storage: PageSaveStoragePort;
}
