import {
  PAGE_SAVE_PENDING_SCHEMA_VERSION,
  type PageSaveDialogState,
  type PageSaveItemInput,
  type PageSaveItemState,
  type PageSavePendingRecord,
  type PageSaveRegistrationInput,
  type PageSaveSnapshot,
  type PageSaveStatusPatch,
} from "../domain/page-save.types";
import {
  deletePageSavePendingRecord,
  loadPageSavePendingRecords,
  persistPageSavePendingRecord,
} from "./page-save-persistence";

interface StoredRegistration extends PageSaveRegistrationInput {
  items: PageSaveItemState[];
}

const registrations = new Map<string, StoredRegistration>();
const persistedRecords = new Map<string, PageSavePendingRecord>();
let activeRegistrationId: string | null = null;
let dialogOpen = false;
let hydrated = false;
const listeners = new Set<() => void>();

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
  const isSaving = active?.isSaving ?? false;
  const selectedDirty = active ? selectedDirtyItems(active.items) : [];
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
      selectedDirty.length > 0 &&
      !blockedSelected &&
      !isSaving &&
      (active?.canSave ?? false),
    label: active?.label ?? persisted?.pageLabel ?? null,
    registrationId: active?.id ?? persisted?.id ?? null,
    hasPersistedPending: persisted !== null,
    dialogOpen,
    dialog: dialogOpen ? buildDialogState() : null,
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
    selected: previousById.get(item.id)?.selected ?? true,
  }));
}

function hasDirtyItems(items: PageSaveItemState[]): boolean {
  return items.some((item) => item.isDirty);
}

function selectedDirtyItems(items: PageSaveItemState[]): PageSaveItemState[] {
  return items.filter((item) => item.isDirty && item.selected);
}

function resolveActiveRegistration(): StoredRegistration | null {
  if (!activeRegistrationId) return null;
  return registrations.get(activeRegistrationId) ?? null;
}

function resolvePrimaryPersisted(): PageSavePendingRecord | null {
  if (activeRegistrationId && persistedRecords.has(activeRegistrationId)) {
    return persistedRecords.get(activeRegistrationId) ?? null;
  }
  return [...persistedRecords.values()].at(-1) ?? null;
}

function buildPendingRecord(registration: StoredRegistration): PageSavePendingRecord {
  return {
    schemaVersion: PAGE_SAVE_PENDING_SCHEMA_VERSION,
    id: registration.id,
    pageLabel: registration.label,
    returnPath: registration.returnPath,
    items: registration.items.map((item) => ({ ...item })),
    updatedAt: nowIso(),
  };
}

async function syncPersistedRegistration(registration: StoredRegistration): Promise<void> {
  if (!hasDirtyItems(registration.items)) {
    persistedRecords.delete(registration.id);
    await deletePageSavePendingRecord(registration.id);
    return;
  }

  const record = buildPendingRecord(registration);
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
  const blockedSelected = selectedDirty.some((item) => !item.canSave);

  return {
    registrationId: source.id,
    pageLabel: active?.label ?? persisted!.pageLabel,
    returnPath: active?.returnPath ?? persisted!.returnPath,
    items,
    isSaving: active?.isSaving ?? false,
    canSave: selectedDirty.length > 0 && !blockedSelected && !(active?.isSaving ?? false),
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
    persistedRecords.set(record.id, record);
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

  const nextItems = patch.items
    ? normalizeItems(patch.items, current.items)
    : current.items;
  const nextLabel = patch.label ?? current.label;
  const nextReturnPath = patch.returnPath ?? current.returnPath;
  const nextIsSaving = patch.isSaving ?? current.isSaving;
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

export function openPageSaveDialog(): void {
  if (!getPageSaveSnapshot().isDirty && !getPageSaveSnapshot().isSaving) return;
  dialogOpen = true;
  emit();
}

export function closePageSaveDialog(): void {
  dialogOpen = false;
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

export async function executePageSave(): Promise<boolean> {
  const dialog = buildDialogState();
  if (!dialog) return false;

  const active = resolveActiveRegistration();
  const selectedIds = selectedDirtyItems(dialog.items).map((item) => item.id);
  if (selectedIds.length === 0) return false;

  if (!active || active.id !== dialog.registrationId) {
    markPageSaveExecuteAfterNavigation(dialog.registrationId);
    closePageSaveDialog();
    if (typeof window !== "undefined") {
      window.location.assign(dialog.returnPath);
    }
    return false;
  }

  if (active.isSaving || !dialog.canSave) return false;

  if (active.handle.prepareForSave) {
    const prepared = await active.handle.prepareForSave(selectedIds);
    if (!prepared) return false;
  }

  const saved = await active.handle.save(selectedIds);
  if (saved) {
    const cleanedItems = active.items.map((item) =>
      selectedIds.includes(item.id)
        ? { ...item, isDirty: false, selected: true }
        : item,
    );
    registrations.set(active.id, {
      ...active,
      items: cleanedItems,
      isSaving: false,
    });
    persistedRecords.delete(active.id);
    await deletePageSavePendingRecord(active.id);
    closePageSaveDialog();
    emit();
  }
  return saved;
}

export function resetPageSaveRegistryForTests(): void {
  registrations.clear();
  persistedRecords.clear();
  activeRegistrationId = null;
  dialogOpen = false;
  hydrated = false;
  listeners.clear();
  cachedSnapshot = IDLE_SNAPSHOT;
}
