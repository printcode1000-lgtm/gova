import type { PageSaveOperationKind } from "./page-save-operation.types";

export const PAGE_SAVE_JOURNAL_SCHEMA_VERSION = 1 as const;

/**
 * Lifecycle of one page-originated persistence operation.
 *
 * `running` is the only state whose outcome the client cannot know on its own:
 * the request left the device, and the process died before an answer arrived.
 * It is therefore never replayed automatically.
 */
export type PageSaveJournalStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed";

export interface PageSaveJournalEntry {
  schemaVersion: typeof PAGE_SAVE_JOURNAL_SCHEMA_VERSION;
  /** Stable per scope + item, so a retry updates the same entry. */
  operationId: string;
  /**
   * Travels with the request so a backend that supports it can reject a replay.
   * Stable across retries of the same user intent, new for a new intent.
   */
  idempotencyKey: string;
  scopeId: string;
  itemId: string;
  kind: PageSaveOperationKind;
  label: string;
  returnPath: string;
  status: PageSaveJournalStatus;
  attempts: number;
  startedAt: string;
  updatedAt: string;
  error?: string;
}

/** How a recovered entry should be treated after the app reopens. */
export type PageSaveRecoveryVerdict =
  | "completed"
  | "failed"
  | "incomplete"
  | "needsConfirmation";

export interface PageSaveRecoveredOperation {
  entry: PageSaveJournalEntry;
  verdict: PageSaveRecoveryVerdict;
  /** True only when replaying cannot duplicate work that already landed. */
  safeToRetry: boolean;
}
