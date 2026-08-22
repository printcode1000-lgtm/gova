import {
  PAGE_SAVE_JOURNAL_SCHEMA_VERSION,
  type PageSaveJournalEntry,
  type PageSaveJournalStatus,
  type PageSaveRecoveredOperation,
  type PageSaveRecoveryVerdict,
} from "../domain/page-save-journal.types";
import type { PageSaveOperationKind } from "../domain/page-save-operation.types";
import { requirePageSaveStorage } from "./page-save-persistence";

/**
 * Durable record of what the page tried to persist and how far it got, so an
 * interruption (tab closed, PWA suspended, refresh, crash) leaves evidence
 * instead of silence. IndexedDB itself belongs to the data package; this module
 * only decides what is worth writing and how to read it back.
 */

function nowIso(): string {
  return new Date().toISOString();
}

function randomId(): string {
  const globalCrypto = globalThis.crypto;
  if (globalCrypto && "randomUUID" in globalCrypto) {
    return globalCrypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildPageSaveOperationId(scopeId: string, itemId: string): string {
  return `${scopeId}::${itemId}`;
}

export interface OpenPageSaveJournalEntryInput {
  scopeId: string;
  itemId: string;
  kind: PageSaveOperationKind;
  label: string;
  returnPath: string;
}

/**
 * Marks an operation as in flight before the request leaves the device. Reusing
 * an existing entry keeps its idempotency key, so a retry of the same intent is
 * recognisable rather than looking like fresh work.
 */
export async function openPageSaveJournalEntry(
  input: OpenPageSaveJournalEntryInput,
): Promise<PageSaveJournalEntry> {
  const storage = requirePageSaveStorage();
  const operationId = buildPageSaveOperationId(input.scopeId, input.itemId);
  const previous = await storage.getJournalEntry(operationId);

  const entry: PageSaveJournalEntry = {
    schemaVersion: PAGE_SAVE_JOURNAL_SCHEMA_VERSION,
    operationId,
    idempotencyKey: previous?.idempotencyKey ?? randomId(),
    scopeId: input.scopeId,
    itemId: input.itemId,
    kind: input.kind,
    label: input.label,
    returnPath: input.returnPath,
    status: "running",
    attempts: (previous?.attempts ?? 0) + 1,
    startedAt: previous?.startedAt ?? nowIso(),
    updatedAt: nowIso(),
  };

  await storage.setJournalEntry(entry);
  return entry;
}

/**
 * Records the outcome. A success is removed rather than kept: the work landed,
 * and a surviving record would only invite a replay.
 */
export async function settlePageSaveJournalEntry(
  entry: PageSaveJournalEntry,
  status: Extract<PageSaveJournalStatus, "succeeded" | "failed">,
  error?: unknown,
): Promise<void> {
  const storage = requirePageSaveStorage();

  if (status === "succeeded") {
    await storage.deleteJournalEntry(entry.operationId);
    return;
  }

  await storage.setJournalEntry({
    ...entry,
    status,
    updatedAt: nowIso(),
    error: error instanceof Error ? error.message : error ? String(error) : undefined,
  });
}

function classify(entry: PageSaveJournalEntry): PageSaveRecoveredOperation {
  const verdict: PageSaveRecoveryVerdict =
    entry.status === "succeeded"
      ? "completed"
      : entry.status === "failed"
        ? "failed"
        : entry.status === "running"
          ? "needsConfirmation"
          : "incomplete";

  return {
    entry,
    verdict,
    // A request that was already in flight may have landed on the backend; only
    // the user can decide to run it again.
    safeToRetry: verdict === "failed" || verdict === "incomplete",
  };
}

/**
 * Reads what the previous session left behind. Entries that carry no ambiguity
 * are pruned as they are reported, so the same interruption is only surfaced
 * once.
 */
export async function recoverPageSaveJournal(): Promise<PageSaveRecoveredOperation[]> {
  const storage = requirePageSaveStorage();
  const entries = await storage.listJournalEntries();
  const recovered = entries.map(classify);

  await Promise.all(
    recovered
      .filter(
        (operation) =>
          operation.verdict === "completed" || operation.verdict === "incomplete",
      )
      .map((operation) => storage.deleteJournalEntry(operation.entry.operationId)),
  );

  return recovered;
}

export async function acknowledgePageSaveJournalEntry(
  operationId: string,
): Promise<void> {
  await requirePageSaveStorage().deleteJournalEntry(operationId);
}
