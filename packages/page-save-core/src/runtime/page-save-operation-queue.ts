import type { PageSaveItemInput } from "../domain/page-save.types";
import type { PageSaveStagedOperation } from "../domain/page-save-operation.types";

/**
 * Holds the save / upload / delete work that pages stage for the page-save
 * registry. Pages never execute these directly; `runPageSaveOperations` is
 * called from the registry save handle once the user confirms.
 */
const operations = new Map<string, Map<string, PageSaveStagedOperation>>();
const itemsCache = new Map<string, PageSaveItemInput[]>();
const listeners = new Set<() => void>();

const EMPTY_ITEMS: PageSaveItemInput[] = [];

function emit(): void {
  itemsCache.clear();
  listeners.forEach((listener) => listener());
}

export function subscribePageSaveOperations(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function stagePageSaveOperation(operation: PageSaveStagedOperation): void {
  const scope = operations.get(operation.scopeId) ?? new Map();
  scope.set(operation.itemId, operation);
  operations.set(operation.scopeId, scope);
  emit();
}

export function unstagePageSaveOperation(scopeId: string, itemId: string): void {
  const scope = operations.get(scopeId);
  if (!scope?.delete(itemId)) return;
  if (scope.size === 0) operations.delete(scopeId);
  emit();
}

/** Returns the item ids that were dropped so callers can clean their state. */
export function clearPageSaveOperations(scopeId: string): string[] {
  const scope = operations.get(scopeId);
  if (!scope) return [];
  const itemIds = [...scope.keys()];
  operations.delete(scopeId);
  emit();
  return itemIds;
}

export function listPageSaveOperations(scopeId: string): PageSaveStagedOperation[] {
  return [...(operations.get(scopeId)?.values() ?? [])];
}

export function hasPageSaveOperation(scopeId: string, itemId: string): boolean {
  return operations.get(scopeId)?.has(itemId) ?? false;
}

/**
 * Returns a referentially stable item list per scope so React external-store
 * subscribers do not re-render on every read.
 */
export function buildPageSaveOperationItems(scopeId: string): PageSaveItemInput[] {
  const cached = itemsCache.get(scopeId);
  if (cached) return cached;

  const staged = listPageSaveOperations(scopeId);
  const items =
    staged.length === 0
      ? EMPTY_ITEMS
      : staged.map((operation) => ({
          id: operation.itemId,
          label: operation.label,
          description: operation.description,
          operation: operation.kind,
          ephemeral: true,
          isDirty: true,
          canSave: operation.canSave ?? true,
        }));
  itemsCache.set(scopeId, items);
  return items;
}

/**
 * Runs the selected staged operations in stage order. A failed operation stays
 * staged so the page-save dialog can surface it again on the next attempt.
 */
export async function runPageSaveOperations(
  scopeId: string,
  selectedItemIds: string[],
): Promise<boolean> {
  const selected = new Set(selectedItemIds);
  const pending = listPageSaveOperations(scopeId).filter((operation) =>
    selected.has(operation.itemId),
  );
  if (pending.length === 0) return true;

  let allSucceeded = true;
  for (const operation of pending) {
    let succeeded = false;
    try {
      succeeded = (await operation.execute()) !== false;
    } catch {
      succeeded = false;
    }
    if (succeeded) unstagePageSaveOperation(scopeId, operation.itemId);
    else allSucceeded = false;
  }
  return allSucceeded;
}

export function resetPageSaveOperationsForTests(): void {
  operations.clear();
  itemsCache.clear();
  listeners.clear();
}
