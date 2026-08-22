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
  await requireStorage().setPending(record);
}

export async function deletePageSavePendingRecord(
  id: PageSaveScopeId,
): Promise<void> {
  await requireStorage().deletePending(id);
}

export async function loadPageSavePendingRecords(): Promise<
  PageSavePendingRecord[]
> {
  return requireStorage().listPending();
}

export function resetPageSavePersistenceForTests(): void {
  runtimeConfig = null;
  memoryPending.clear();
  memoryJournal.clear();
}
