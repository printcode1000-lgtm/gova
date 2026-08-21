import type {
  PageSavePendingRecord,
  PageSaveRuntimeConfig,
  PageSaveScopeId,
  PageSaveStoragePort,
} from "../domain/page-save.types";

let runtimeConfig: PageSaveRuntimeConfig | null = null;
const memoryStore = new Map<PageSaveScopeId, PageSavePendingRecord>();

function requireStorage(): PageSaveStoragePort {
  return runtimeConfig?.storage ?? {
    getPending: async (id) => memoryStore.get(id),
    setPending: async (record) => {
      memoryStore.set(record.id, record);
    },
    deletePending: async (id) => {
      memoryStore.delete(id);
    },
    listPending: async () => [...memoryStore.values()],
  };
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
  memoryStore.clear();
}
