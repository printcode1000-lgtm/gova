import {
  PAGE_SAVE_PENDING_SCHEMA_VERSION,
  type PageSaveDialogState,
  type PageSaveItemInput,
  type PageSaveItemState,
  type PageSavePendingRecord,
  type PageSaveRegistrationInput,
  type PageSaveResult,
  type PageSaveSnapshot,
  type PageSaveStatusPatch,
} from "../domain/page-save.types";
import {
  deletePageSavePendingRecord,
  loadPageSavePendingRecords,
  persistPageSavePendingRecord,
} from "./page-save-persistence";
import {
  acknowledgePageSaveJournalEntry,
  openPageSaveJournalEntry,
  recoverPageSaveJournal,
  settlePageSaveJournalEntry,
} from "./page-save-journal";
import { unstagePageSaveOperation } from "./page-save-operation-queue";
import type {
  PageSaveJournalEntry,
  PageSaveRecoveredOperation,
} from "../domain/page-save-journal.types";

interface StoredRegistration extends PageSaveRegistrationInput {
  items: PageSaveItemState[];
}

const registrations = new Map<string, StoredRegistration>();
const persistedRecords = new Map<string, PageSavePendingRecord>();
let activeRegistrationId: string | null = null;
let dialogOpen = false;
let hydrated = false;
let activeSaveExecutionId: string | null = null;
let lastResult: PageSaveResult | null = null;
let interrupted: PageSaveRecoveredOperation[] = [];
let recoveryHydrated = false;
const heldCleanPasses = new Map<string, Map<string, number>>();
const listeners = new Set<() => void>();

function markItemsHeldClean(registrationId: string, itemIds: string[]): void {
  heldCleanPasses.set(
    registrationId,
    new Map(itemIds.map((itemId) => [itemId, 0])),
  );
}

function applyHeldClean(
  registrationId: string,
  items: PageSaveItemState[],
): PageSaveItemState[] {
  const passes = heldCleanPasses.get(registrationId);
  if (!passes || passes.size === 0) return items;

  // An item that left the list (a staged operation that ran) must not keep a
  // pending pass, or re-staging the same id would be swallowed as stale.
  const present = new Set(items.map((item) => item.id));
  passes.forEach((_pass, itemId) => {
    if (!present.has(itemId)) passes.delete(itemId);
  });
  if (passes.size === 0) {
    heldCleanPasses.delete(registrationId);
    return items;
  }

  return items.map((item) => {
    const pass = passes.get(item.id);
    if (pass === undefined) return item;
    if (!item.isDirty) {
      passes.delete(item.id);
      if (passes.size === 0) heldCleanPasses.delete(registrationId);
      return item;
    }
    if (pass === 0) {
      passes.set(item.id, 1);
      return { ...item, isDirty: false, selected: item.selected };
    }
    passes.delete(item.id);
    if (passes.size === 0) heldCleanPasses.delete(registrationId);
    return item;
  });
}

function isRegistrationSaving(registration: StoredRegistration | null): boolean {
  if (!registration) return false;
  return (
    activeSaveExecutionId === registration.id || registration.isSaving === true
  );
}

const IDLE_SNAPSHOT: PageSaveSnapshot = {
  phase: "idle",
  isDirty: false,
  isSaving: false,
  canSave: false,
  label: null,
  registrationId: null,
  hasPersistedPending: false,
  dialogOpen: false,
  dialog: null,
  lastResult: null,
  interrupted: [],
};

let cachedSnapshot: PageSaveSnapshot = IDLE_SNAPSHOT;

function itemsEqual(a: PageSaveItemState[], b: PageSaveItemState[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, index) => {
    const other = b[index];
    return (
      item.id === other?.id &&
      item.label === other?.label &&
      item.description === other?.description &&
      item.operation === other?.operation &&
      item.isDirty === other?.isDirty &&
      item.canSave === other?.canSave &&
      item.selected === other?.selected
    );
  });
}

function dialogStatesEqual(
  left: PageSaveDialogState | null,
  right: PageSaveDialogState | null,
): boolean {
  if (left === right) return true;
  if (!left || !right) return false;
  return (
    left.registrationId === right.registrationId &&
    left.pageLabel === right.pageLabel &&
    left.returnPath === right.returnPath &&
    left.isSaving === right.isSaving &&
    left.canSave === right.canSave &&
    left.requiresNavigation === right.requiresNavigation &&
    itemsEqual(left.items, right.items)
  );
}

function snapshotsEqual(
  left: PageSaveSnapshot,
  right: PageSaveSnapshot,
): boolean {
  return (
    left.phase === right.phase &&
    left.isDirty === right.isDirty &&
    left.isSaving === right.isSaving &&
    left.canSave === right.canSave &&
    left.label === right.label &&
    left.registrationId === right.registrationId &&
    left.hasPersistedPending === right.hasPersistedPending &&
    left.dialogOpen === right.dialogOpen &&
    left.lastResult === right.lastResult &&
    left.interrupted === right.interrupted &&
    dialogStatesEqual(left.dialog, right.dialog)
  );
}

function emit(): void {
  refreshPageSaveSnapshot();
  listeners.forEach((listener) => listener());
}

function refreshPageSaveSnapshot(): void {
  const active = resolveActiveRegistration();
  const persisted = resolvePrimaryPersisted();
  const activeDirty = active ? hasDirtyItems(active.items) : false;
  const isDirty = activeDirty || persisted !== null;
  const isSaving = isRegistrationSaving(active);
  const selectedDirty = active ? selectedDirtyItems(active.items) : [];
  const discardableDirty =
    active?.items.some(
      (item) => item.isDirty && item.ephemeral && !item.selected,
    ) ?? false;
  const blockedSelected = selectedDirty.some((item) => !item.canSave);

  let phase: PageSaveSnapshot["phase"] = "idle";
  if (isSaving) phase = "saving";
  else if (isDirty) phase = "dirty";

  const next: PageSaveSnapshot = {
    phase,
    isDirty,
    isSaving,
    canSave:
      activeDirty &&
      (selectedDirty.length > 0 || discardableDirty) &&
      !blockedSelected &&
      !isSaving &&
      (active?.canSave ?? false),
    label: active?.label ?? persisted?.pageLabel ?? null,
    registrationId: active?.id ?? persisted?.id ?? null,
    hasPersistedPending: persisted !== null,
    dialogOpen,
    dialog: dialogOpen ? buildDialogState() : null,
    lastResult,
    interrupted,
  };

  if (!snapshotsEqual(cachedSnapshot, next)) {
    cachedSnapshot = next;
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeItems(items: PageSaveItemInput[], previous?: PageSaveItemState[]): PageSaveItemState[] {
  const previousById = new Map(previous?.map((item) => [item.id, item]) ?? []);
  return items.map((item) => ({
    ...item,
    operation: item.operation ?? "save",
    // Form-derived work cannot be abandoned independently from the form state:
    // its edited values are still mounted and would immediately make it dirty
    // again. Only staged operations own an executor that can be discarded.
    selected: item.ephemeral
      ? (previousById.get(item.id)?.selected ?? true)
      : true,
  }));
}

function hasDirtyItems(items: PageSaveItemState[]): boolean {
  return items.some((item) => item.isDirty);
}

function selectedDirtyItems(items: PageSaveItemState[]): PageSaveItemState[] {
  return items.filter((item) => item.isDirty && item.selected);
}

/**
 * Pages may mount several scopes at once (an editor plus a reviews surface).
 * The header drives whichever scope actually has work, falling back to the most
 * recently registered one.
 */
function resolveActiveRegistration(): StoredRegistration | null {
  const current = activeRegistrationId
    ? (registrations.get(activeRegistrationId) ?? null)
    : null;
  if (current && hasDirtyItems(current.items)) return current;

  const dirty = [...registrations.values()]
    .reverse()
    .find((registration) => hasDirtyItems(registration.items));
  return dirty ?? current;
}

function resolvePrimaryPersisted(): PageSavePendingRecord | null {
  if (activeRegistrationId && persistedRecords.has(activeRegistrationId)) {
    return persistedRecords.get(activeRegistrationId) ?? null;
  }
  return [...persistedRecords.values()].at(-1) ?? null;
}

function persistableItems(items: PageSaveItemState[]): PageSaveItemState[] {
  return items.filter((item) => !item.ephemeral);
}

function buildPendingRecord(
  registration: StoredRegistration,
  items: PageSaveItemState[],
): PageSavePendingRecord {
  return {
    schemaVersion: PAGE_SAVE_PENDING_SCHEMA_VERSION,
    id: registration.id,
    pageLabel: registration.label,
    returnPath: registration.returnPath,
    items: items.map((item) => ({ ...item })),
    updatedAt: nowIso(),
  };
}

async function syncPersistedRegistration(registration: StoredRegistration): Promise<void> {
  const persistable = persistableItems(registration.items);
  if (!hasDirtyItems(persistable)) {
    persistedRecords.delete(registration.id);
    await deletePageSavePendingRecord(registration.id);
    return;
  }

  const record = buildPendingRecord(registration, persistable);
  persistedRecords.set(registration.id, record);
  await persistPageSavePendingRecord(record);
}

function buildDialogState(): PageSaveDialogState | null {
  const active = resolveActiveRegistration();
  const persisted = active ? null : resolvePrimaryPersisted();
  const source = active ?? persisted;
  if (!source) return null;

  const items = active?.items ?? persisted!.items;
  const selectedDirty = selectedDirtyItems(items);
  const discardableDirty = items.some(
    (item) => item.isDirty && item.ephemeral && !item.selected,
  );
  const blockedSelected = selectedDirty.some((item) => !item.canSave);

  return {
    registrationId: source.id,
    pageLabel: active?.label ?? persisted!.pageLabel,
    returnPath: active?.returnPath ?? persisted!.returnPath,
    items,
    isSaving: isRegistrationSaving(active),
    canSave:
      (selectedDirty.length > 0 || discardableDirty) &&
      !blockedSelected &&
      !isRegistrationSaving(active),
    requiresNavigation: !active,
  };
}

export function getPageSaveSnapshot(): PageSaveSnapshot {
  refreshPageSaveSnapshot();
  return cachedSnapshot;
}

export function subscribePageSave(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function hydratePageSavePendingFromStorage(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  const records = await loadPageSavePendingRecords();
  persistedRecords.clear();
  records.forEach((record) => {
    persistedRecords.set(record.id, {
      ...record,
      items: record.items.map((item) => ({ ...item, selected: true })),
    });
  });
  emit();
}

export function registerPageSave(registration: PageSaveRegistrationInput): () => void {
  const previous = registrations.get(registration.id);
  const stored: StoredRegistration = {
    ...registration,
    items: normalizeItems(registration.items, previous?.items),
  };
  registrations.set(registration.id, stored);
  activeRegistrationId = registration.id;
  void syncPersistedRegistration(stored);
  emit();

  return () => {
    registrations.delete(registration.id);
    if (activeRegistrationId === registration.id) {
      activeRegistrationId = [...registrations.keys()].at(-1) ?? null;
    }
    emit();
  };
}

export function updatePageSaveRegistration(
  id: string,
  patch: PageSaveStatusPatch,
): void {
  const current = registrations.get(id);
  if (!current) return;

  const nextItems = applyHeldClean(
    id,
    patch.items ? normalizeItems(patch.items, current.items) : current.items,
  );
  const nextLabel = patch.label ?? current.label;
  const nextReturnPath = patch.returnPath ?? current.returnPath;
  const nextIsSaving =
    activeSaveExecutionId === id
      ? current.isSaving
      : (patch.isSaving ?? current.isSaving);
  const nextCanSave = patch.canSave ?? current.canSave;

  if (
    nextLabel === current.label &&
    nextReturnPath === current.returnPath &&
    nextIsSaving === current.isSaving &&
    nextCanSave === current.canSave &&
    itemsEqual(nextItems, current.items)
  ) {
    return;
  }

  const next: StoredRegistration = {
    ...current,
    label: nextLabel,
    returnPath: nextReturnPath,
    isSaving: nextIsSaving,
    canSave: nextCanSave,
    items: nextItems,
  };
  registrations.set(id, next);
  void syncPersistedRegistration(next);
  emit();
}

export function setPageSaveItemSelected(
  registrationId: string,
  itemId: string,
  selected: boolean,
): void {
  const current = registrations.get(registrationId);
  const persisted = persistedRecords.get(registrationId);

  if (current) {
    const existing = current.items.find((item) => item.id === itemId);
    if (!existing?.ephemeral) return;
    if (existing?.selected === selected) return;

    const items = current.items.map((item) =>
      item.id === itemId ? { ...item, selected } : item,
    );
    registrations.set(registrationId, { ...current, items });
    void syncPersistedRegistration({ ...current, items });
    emit();
    return;
  }

  if (persisted) {
    const existing = persisted.items.find((item) => item.id === itemId);
    if (!existing?.ephemeral) return;
    if (existing?.selected === selected) return;

    const items = persisted.items.map((item) =>
      item.id === itemId ? { ...item, selected } : item,
    );
    const nextRecord = { ...persisted, items, updatedAt: nowIso() };
    persistedRecords.set(registrationId, nextRecord);
    void persistPageSavePendingRecord(nextRecord);
    emit();
  }
}

/**
 * Forgets specific items whose work cannot outlive the page — staged operations
 * hold in-memory executors, so a persisted record would point at nothing. Other
 * dirty items in the same scope keep their pending record.
 */
async function removePageSaveItems(
  registrationId: string,
  itemIds: string[],
): Promise<void> {
  if (itemIds.length === 0) return;
  const dropped = new Set(itemIds);
  let changed = false;
  const persistence: Promise<void>[] = [];

  const current = registrations.get(registrationId);
  if (current) {
    const items = current.items.filter((item) => !dropped.has(item.id));
    if (items.length !== current.items.length) {
      registrations.set(registrationId, { ...current, items });
      changed = true;
    }
  }

  const persisted = persistedRecords.get(registrationId);
  if (persisted) {
    const items = persisted.items.filter((item) => !dropped.has(item.id));
    if (items.length !== persisted.items.length) {
      if (items.some((item) => item.isDirty)) {
        const nextRecord = { ...persisted, items, updatedAt: nowIso() };
        persistedRecords.set(registrationId, nextRecord);
        persistence.push(persistPageSavePendingRecord(nextRecord));
      } else {
        persistedRecords.delete(registrationId);
        persistence.push(deletePageSavePendingRecord(registrationId));
      }
      changed = true;
    }
  }

  if (changed) emit();
  await Promise.all(persistence);
}

export async function dropPageSaveItems(
  registrationId: string,
  itemIds: string[],
): Promise<void> {
  await removePageSaveItems(registrationId, itemIds);
}

/**
 * Reads and clears the last execution result. The header consumes it to show
 * one check mark; leaving it set would flash a stale confirmation on the next
 * page the user opens.
 */
export function acknowledgePageSaveResult(): PageSaveResult | null {
  const result = lastResult;
  if (result === null) return null;
  lastResult = null;
  emit();
  return result;
}

/**
 * Reads what a previous session left unfinished. Anything whose outcome the
 * client cannot know is surfaced for the user to confirm; nothing is replayed.
 */
export async function hydratePageSaveRecoveryFromStorage(): Promise<void> {
  if (recoveryHydrated) return;
  recoveryHydrated = true;
  const recovered = await recoverPageSaveJournal();
  const unresolved = recovered.filter(
    (operation) =>
      operation.verdict === "needsConfirmation" || operation.verdict === "failed",
  );
  if (unresolved.length === 0) return;
  interrupted = unresolved;
  emit();
}

export function acknowledgePageSaveInterruption(operationId: string): void {
  const next = interrupted.filter(
    (operation) => operation.entry.operationId !== operationId,
  );
  if (next.length === interrupted.length) return;
  interrupted = next;
  void acknowledgePageSaveJournalEntry(operationId);
  emit();
}

export function openPageSaveDialog(): void {
  const snapshot = getPageSaveSnapshot();
  if (!snapshot.isDirty && !snapshot.isSaving && snapshot.interrupted.length === 0) {
    return;
  }
  dialogOpen = true;
  lastResult = null;
  emit();
}

export function closePageSaveDialog(): void {
  dialogOpen = false;
  lastResult = null;
  emit();
}

export function consumePageSaveExecuteAfterNavigation(
  registrationId: string,
): boolean {
  if (typeof window === "undefined") return false;
  const key = `page-save:execute:${registrationId}`;
  if (window.sessionStorage.getItem(key) !== "1") return false;
  window.sessionStorage.removeItem(key);
  return true;
}

export function markPageSaveExecuteAfterNavigation(registrationId: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(`page-save:execute:${registrationId}`, "1");
}

async function openJournalForSelection(
  registration: StoredRegistration,
  selectedIds: string[],
): Promise<PageSaveJournalEntry[]> {
  const selected = new Set(selectedIds);
  return Promise.all(
    registration.items
      .filter((item) => selected.has(item.id))
      .map((item) =>
        openPageSaveJournalEntry({
          scopeId: registration.id,
          itemId: item.id,
          kind: item.operation,
          label: item.label,
          returnPath: registration.returnPath,
        }),
      ),
  );
}

export async function executePageSave(): Promise<boolean> {
  const dialog = buildDialogState();
  if (!dialog) return false;

  let active = resolveActiveRegistration();

  if (!active || active.id !== dialog.registrationId) {
    markPageSaveExecuteAfterNavigation(dialog.registrationId);
    closePageSaveDialog();
    if (typeof window !== "undefined") {
      window.location.assign(dialog.returnPath);
    }
    return false;
  }

  if (active.isSaving || !dialog.canSave) return false;

  // Unchecked staged operations are deliberately abandoned when Execute is
  // pressed. They never run, and both their in-memory executors and any stale
  // pending representation are removed before selected work starts.
  const discardedIds = dialog.items
    .filter((item) => item.isDirty && item.ephemeral && !item.selected)
    .map((item) => item.id);
  for (const itemId of discardedIds) {
    unstagePageSaveOperation(dialog.registrationId, itemId);
  }
  await dropPageSaveItems(dialog.registrationId, discardedIds);

  active = resolveActiveRegistration();
  if (!active || active.id !== dialog.registrationId) {
    dialogOpen = false;
    lastResult = "success";
    emit();
    return true;
  }

  const selectedIds = selectedDirtyItems(active.items).map((item) => item.id);
  if (selectedIds.length === 0) {
    dialogOpen = false;
    lastResult = "success";
    emit();
    return true;
  }

  activeSaveExecutionId = active.id;
  const markSaving = (saving: boolean): void => {
    const current = resolveActiveRegistration();
    if (!current || current.id !== active.id) return;
    registrations.set(current.id, { ...current, isSaving: saving });
    emit();
  };

  markSaving(true);
  lastResult = null;

  // The journal opens before the first request leaves the device, so an
  // interruption anywhere below is recoverable instead of silent.
  const journalled = await openJournalForSelection(active, selectedIds);
  const settle = (status: "succeeded" | "failed", error?: unknown) =>
    Promise.all(
      journalled.map((entry) => settlePageSaveJournalEntry(entry, status, error)),
    );

  try {
    if (active.handle.prepareForSave) {
      const prepared = await active.handle.prepareForSave(selectedIds);
      if (!prepared) {
        await settle("failed");
        lastResult = "failure";
        markSaving(false);
        return false;
      }
    }

    const saved = await active.handle.save(selectedIds);
    await settle(saved ? "succeeded" : "failed");
    if (saved) {
      const current = resolveActiveRegistration();
      if (current && current.id === active.id) {
        const cleanedItems = current.items.map((item) =>
          selectedIds.includes(item.id)
            ? { ...item, isDirty: false, selected: true }
            : item,
        );
        registrations.set(current.id, {
          ...current,
          items: cleanedItems,
          isSaving: false,
        });
        markItemsHeldClean(active.id, selectedIds);
      }
      persistedRecords.delete(active.id);
      await deletePageSavePendingRecord(active.id);
      dialogOpen = false;
      lastResult = "success";
      emit();
    } else {
      lastResult = "failure";
      markSaving(false);
    }
    return saved;
  } catch (error) {
    await settle("failed", error);
    lastResult = "failure";
    markSaving(false);
    throw error;
  } finally {
    if (activeSaveExecutionId === active.id) {
      activeSaveExecutionId = null;
      emit();
    }
  }
}

export function resetPageSaveRegistryForTests(): void {
  registrations.clear();
  persistedRecords.clear();
  activeRegistrationId = null;
  dialogOpen = false;
  hydrated = false;
  activeSaveExecutionId = null;
  lastResult = null;
  interrupted = [];
  recoveryHydrated = false;
  heldCleanPasses.clear();
  listeners.clear();
  cachedSnapshot = IDLE_SNAPSHOT;
}
