import type {
  PageSavePendingRecord,
  PageSaveRuntimeConfig,
  PageSaveScopeId,
  PageSaveStoragePort,
} from "../domain/page-save.types";
import type { PageSaveJournalEntry } from "../domain/page-save-journal.types";

let runtimeConfig: PageSaveRuntimeConfig | null = null;
const memoryPending = new Map<PageSaveScopeId, PageSavePendingRecord>();
const memoryJournal = new Map<string, PageSaveJournalEntry>();
const pendingMutationQueues = new Map<PageSaveScopeId, Promise<void>>();
const journalMutationQueues = new Map<string, Promise<unknown>>();

const STORAGE_ATTEMPTS = 3;

/** Retry short-lived IndexedDB/WebView transaction failures without reordering writes. */
export async function runPageSaveStorageOperation<T>(
  operation: () => Promise<T>,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < STORAGE_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt + 1 < STORAGE_ATTEMPTS) await Promise.resolve();
    }
  }
  throw lastError;
}

function enqueuePendingMutation(
  id: PageSaveScopeId,
  operation: () => Promise<void>,
): Promise<void> {
  const previous = pendingMutationQueues.get(id);
  const current = previous
    ? previous
        .catch(() => undefined)
        .then(() => runPageSaveStorageOperation(operation))
    : runPageSaveStorageOperation(operation);
  pendingMutationQueues.set(id, current);
  void current
    .finally(() => {
      if (pendingMutationQueues.get(id) === current)
        pendingMutationQueues.delete(id);
    })
    .catch(() => undefined);
  return current;
}

async function flushPendingMutations(): Promise<void> {
  while (pendingMutationQueues.size > 0) {
    const current = [...pendingMutationQueues.values()];
    await Promise.allSettled(current);
  }
}

export function enqueuePageSaveJournalMutation<T>(
  operationId: string,
  operation: () => Promise<T>,
): Promise<T> {
  const previous = journalMutationQueues.get(operationId);
  const current = previous
    ? previous
        .catch(() => undefined)
        .then(() => runPageSaveStorageOperation(operation))
    : runPageSaveStorageOperation(operation);
  journalMutationQueues.set(operationId, current);
  void current
    .finally(() => {
      if (journalMutationQueues.get(operationId) === current) {
        journalMutationQueues.delete(operationId);
      }
    })
    .catch(() => undefined);
  return current;
}

export async function flushPageSaveJournalMutations(): Promise<void> {
  while (journalMutationQueues.size > 0) {
    const current = [...journalMutationQueues.values()];
    await Promise.allSettled(current);
  }
}

/**
 * The host wires a durable port at boot. Until then — server rendering, tests —
 * an in-memory store keeps the registry working without pretending anything was
 * persisted.
 */
function requireStorage(): PageSaveStoragePort {
  return (
    runtimeConfig?.storage ?? {
      getPending: async (id) => memoryPending.get(id),
      setPending: async (record) => {
        memoryPending.set(record.id, record);
      },
      deletePending: async (id) => {
        memoryPending.delete(id);
      },
      listPending: async () => [...memoryPending.values()],
      getJournalEntry: async (operationId) => memoryJournal.get(operationId),
      setJournalEntry: async (entry) => {
        memoryJournal.set(entry.operationId, entry);
      },
      deleteJournalEntry: async (operationId) => {
        memoryJournal.delete(operationId);
      },
      listJournalEntries: async () => [...memoryJournal.values()],
    }
  );
}

export function requirePageSaveStorage(): PageSaveStoragePort {
  return requireStorage();
}

export function configurePageSaveCore(config: PageSaveRuntimeConfig): void {
  runtimeConfig = config;
}

export async function persistPageSavePendingRecord(
  record: PageSavePendingRecord,
): Promise<void> {
  await enqueuePendingMutation(record.id, () =>
    requireStorage().setPending(record),
  );
}

export async function deletePageSavePendingRecord(
  id: PageSaveScopeId,
): Promise<void> {
  await enqueuePendingMutation(id, () => requireStorage().deletePending(id));
}

export async function loadPageSavePendingRecords(): Promise<
  PageSavePendingRecord[]
> {
  // Hydration must never observe an older durable state while a newer in-memory
  // mutation for the same scope is still queued.
  await flushPendingMutations();
  return runPageSaveStorageOperation(() => requireStorage().listPending());
}

export function resetPageSavePersistenceForTests(): void {
  runtimeConfig = null;
  memoryPending.clear();
  memoryJournal.clear();
  pendingMutationQueues.clear();
  journalMutationQueues.clear();
}
