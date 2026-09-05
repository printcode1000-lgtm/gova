import {
  PAGE_SAVE_JOURNAL_SCHEMA_VERSION,
  type PageSaveJournalEntry,
  type PageSaveJournalStatus,
  type PageSaveRecoveredOperation,
  type PageSaveRecoveryVerdict,
} from "../domain/page-save-journal.types";
import type { PageSaveOperationKind } from "../domain/page-save-operation.types";
import {
  enqueuePageSaveJournalMutation,
  flushPageSaveJournalMutations,
  requirePageSaveStorage,
  runPageSaveStorageOperation,
} from "./page-save-persistence";

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

export function buildPageSaveOperationId(
  scopeId: string,
  itemId: string,
): string {
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
  const operationId = buildPageSaveOperationId(input.scopeId, input.itemId);
  return enqueuePageSaveJournalMutation(operationId, async () => {
    const storage = requirePageSaveStorage();
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
  });
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
  await enqueuePageSaveJournalMutation(entry.operationId, async () => {
    const storage = requirePageSaveStorage();

    if (status === "succeeded") {
      try {
        await storage.deleteJournalEntry(entry.operationId);
      } catch {
        // A durable succeeded marker is safer than leaving a stale `running`
        // record behind: recovery will prune it instead of asking the user to
        // retry work that already landed.
        await storage.setJournalEntry({
          ...entry,
          status: "succeeded",
          updatedAt: nowIso(),
        });
      }
      return;
    }

    await storage.setJournalEntry({
      ...entry,
      status,
      updatedAt: nowIso(),
      error:
        error instanceof Error
          ? error.message
          : error
            ? String(error)
            : undefined,
    });
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
export async function recoverPageSaveJournal(): Promise<
  PageSaveRecoveredOperation[]
> {
  await flushPageSaveJournalMutations();
  const storage = requirePageSaveStorage();
  const entries = await runPageSaveStorageOperation(() =>
    storage.listJournalEntries(),
  );
  const validEntries: PageSaveJournalEntry[] = [];
  const invalidOperationIds: string[] = [];
  for (const entry of entries) {
    const valid =
      Boolean(entry) &&
      entry.schemaVersion === PAGE_SAVE_JOURNAL_SCHEMA_VERSION &&
      typeof entry.operationId === "string" &&
      entry.operationId.length > 0 &&
      typeof entry.idempotencyKey === "string" &&
      entry.idempotencyKey.length > 0 &&
      typeof entry.scopeId === "string" &&
      entry.scopeId.length > 0 &&
      typeof entry.itemId === "string" &&
      entry.itemId.length > 0 &&
      ["save", "upload", "delete"].includes(entry.kind) &&
      typeof entry.label === "string" &&
      typeof entry.returnPath === "string" &&
      entry.returnPath.startsWith("/") &&
      ["pending", "running", "failed", "succeeded"].includes(entry.status) &&
      Number.isInteger(entry.attempts) &&
      entry.attempts >= 0 &&
      typeof entry.startedAt === "string" &&
      typeof entry.updatedAt === "string";

    if (valid) validEntries.push(entry);
    else if (
      entry &&
      typeof entry.operationId === "string" &&
      entry.operationId
    ) {
      invalidOperationIds.push(entry.operationId);
    }
  }

  // Corrupt rows can never be executed or acknowledged safely. Remove any row
  // whose key is still identifiable so it cannot keep reappearing forever.
  await Promise.allSettled(
    invalidOperationIds.map((operationId) =>
      enqueuePageSaveJournalMutation(operationId, () =>
        storage.deleteJournalEntry(operationId),
      ),
    ),
  );

  const recovered = validEntries.map(classify);

  await Promise.all(
    recovered
      .filter(
        (operation) =>
          operation.verdict === "completed" ||
          operation.verdict === "incomplete",
      )
      .map((operation) =>
        enqueuePageSaveJournalMutation(operation.entry.operationId, () =>
          storage.deleteJournalEntry(operation.entry.operationId),
        ),
      ),
  );

  return recovered;
}

export async function acknowledgePageSaveJournalEntry(
  operationId: string,
): Promise<void> {
  await enqueuePageSaveJournalMutation(operationId, () =>
    requirePageSaveStorage().deleteJournalEntry(operationId),
  );
}
