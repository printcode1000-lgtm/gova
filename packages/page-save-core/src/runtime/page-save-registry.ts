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
  registrationToken: number;
  statusRevision: number;
}

interface PageSaveRegistrationCleanup {
  (): void;
  registrationToken: number;
}

const registrations = new Map<string, StoredRegistration>();
const persistedRecords = new Map<string, PageSavePendingRecord>();
let activeRegistrationId: string | null = null;
let dialogOpen = false;
let hydrated = false;
let hydrationPromise: Promise<void> | null = null;
let activeSaveExecutionId: string | null = null;
let lastResult: PageSaveResult | null = null;
let interrupted: PageSaveRecoveredOperation[] = [];
let recoveryHydrated = false;
let recoveryHydrationPromise: Promise<void> | null = null;
let nextRegistrationToken = 1;
interface HeldCleanState {
  pass: number;
  throughRevision: number;
}

const heldCleanPasses = new Map<string, Map<string, HeldCleanState>>();
const listeners = new Set<() => void>();

function markItemsHeldClean(
  registrationId: string,
  itemIds: string[],
  throughRevision: number,
): void {
  heldCleanPasses.set(
    registrationId,
    new Map(
      itemIds.map((itemId) => [
        itemId,
        { pass: 0, throughRevision } satisfies HeldCleanState,
      ]),
    ),
  );
}

function applyHeldClean(
  registrationId: string,
  items: PageSaveItemState[],
  statusRevision?: number,
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
    const held = passes.get(item.id);
    if (!held) return item;
    if (!item.isDirty) {
      passes.delete(item.id);
      if (passes.size === 0) heldCleanPasses.delete(registrationId);
      return item;
    }

    // A render produced after the save started can contain a genuine new edit.
    // It must never be swallowed by the stale-update suppression pass.
    if (statusRevision !== undefined && statusRevision > held.throughRevision) {
      passes.delete(item.id);
      if (passes.size === 0) heldCleanPasses.delete(registrationId);
      return item;
    }

    if (held.pass === 0) {
      passes.set(item.id, { ...held, pass: 1 });
      return { ...item, isDirty: false, selected: item.selected };
    }
    passes.delete(item.id);
    if (passes.size === 0) heldCleanPasses.delete(registrationId);
    return item;
  });
}

function isRegistrationSaving(
  registration: StoredRegistration | null,
): boolean {
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
      item.ephemeral === other?.ephemeral &&
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
  const saving = resolveSavingRegistration();
  const persisted = resolvePrimaryPersisted();
  const activeDirty = active !== null;
  const isDirty = activeDirty || persisted !== null;
  const isSaving =
    activeSaveExecutionId !== null || isRegistrationSaving(saving);
  const selectedDirty = active ? selectedDirtyItems(active.items) : [];
  const discardableDirty =
    active?.items.some(
      (item) => item.isDirty && item.ephemeral && !item.selected,
    ) ?? false;
  const blockedSelected = selectedDirty.some((item) => !item.canSave);
  const visibleRegistration = saving ?? active;
  const visiblePersisted = visibleRegistration ? null : persisted;

  let phase: PageSaveSnapshot["phase"] = "idle";
  if (isSaving) phase = "saving";
  else if (isDirty) phase = "dirty";

  let dialog = dialogOpen ? buildDialogState() : null;
  const dialogHasWork = dialog?.items.some((item) => item.isDirty) ?? false;
  if (dialogOpen && !dialogHasWork && interrupted.length === 0) {
    // Work can disappear while the dialog is open (undo, unmount, scope switch,
    // successful external state sync). Never leave an empty modal behind.
    dialogOpen = false;
    dialog = null;
  }

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
    label: visibleRegistration?.label ?? visiblePersisted?.pageLabel ?? null,
    registrationId:
      visibleRegistration?.id ??
      visiblePersisted?.id ??
      activeSaveExecutionId ??
      null,
    hasPersistedPending: persisted !== null,
    dialogOpen,
    dialog,
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

function normalizeItems(
  items: PageSaveItemInput[],
  previous?: PageSaveItemState[],
): PageSaveItemState[] {
  const previousById = new Map(previous?.map((item) => [item.id, item]) ?? []);
  const normalized: PageSaveItemState[] = [];
  const indexById = new Map<string, number>();

  for (const item of items) {
    const next: PageSaveItemState = {
      ...item,
      operation: item.operation ?? "save",
      // Form-derived work cannot be abandoned independently from the form state:
      // its edited values are still mounted and would immediately make it dirty
      // again. Only staged operations own an executor that can be discarded.
      selected: item.ephemeral
        ? (previousById.get(item.id)?.selected ?? true)
        : true,
    };

    const existingIndex = indexById.get(next.id);
    if (existingIndex === undefined) {
      indexById.set(next.id, normalized.length);
      normalized.push(next);
      continue;
    }

    const existing = normalized[existingIndex]!;
    const sameContract =
      existing.operation === next.operation &&
      Boolean(existing.ephemeral) === Boolean(next.ephemeral);
    normalized[existingIndex] = {
      ...next,
      // Two rows sharing an id would journal/execute under the same operation
      // key. Exact duplicates collapse safely; conflicting definitions are kept
      // visible but blocked so ambiguous work can never execute twice.
      isDirty: existing.isDirty || next.isDirty,
      canSave: sameContract ? existing.canSave && next.canSave : false,
      selected: sameContract ? existing.selected && next.selected : true,
      ephemeral: sameContract ? next.ephemeral : undefined,
    };
  }

  return normalized;
}

function hasDirtyItems(items: PageSaveItemState[]): boolean {
  return items.some((item) => item.isDirty);
}

function selectedDirtyItems(items: PageSaveItemState[]): PageSaveItemState[] {
  return items.filter((item) => item.isDirty && item.selected);
}

/**
 * Pages may mount several scopes at once (an editor plus a reviews surface).
 * A clean scope is never a work source: allowing it to shadow dirty persisted
 * work is what produced header waves with an empty/non-opening dialog.
 */
function resolveActiveRegistration(): StoredRegistration | null {
  const current = activeRegistrationId
    ? (registrations.get(activeRegistrationId) ?? null)
    : null;
  if (current && hasDirtyItems(current.items)) return current;

  return (
    [...registrations.values()]
      .reverse()
      .find((registration) => hasDirtyItems(registration.items)) ?? null
  );
}

function resolveSavingRegistration(): StoredRegistration | null {
  if (activeSaveExecutionId) {
    const executing = registrations.get(activeSaveExecutionId);
    if (executing) return executing;
  }

  const current = activeRegistrationId
    ? (registrations.get(activeRegistrationId) ?? null)
    : null;
  if (current?.isSaving) return current;

  return (
    [...registrations.values()]
      .reverse()
      .find((registration) => registration.isSaving) ?? null
  );
}

// A record with nothing dirty left is not pending work: it must never light up
// the header icon or open an empty dialog.
function resolvePrimaryPersisted(): PageSavePendingRecord | null {
  const own = activeRegistrationId
    ? persistedRecords.get(activeRegistrationId)
    : undefined;
  if (own && hasDirtyItems(own.items)) return own;
  return (
    [...persistedRecords.values()]
      .reverse()
      .find((record) => hasDirtyItems(record.items)) ?? null
  );
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

function normalizePersistedRecord(
  value: PageSavePendingRecord,
): PageSavePendingRecord | null {
  if (
    !value ||
    value.schemaVersion !== PAGE_SAVE_PENDING_SCHEMA_VERSION ||
    typeof value.id !== "string" ||
    value.id.length === 0 ||
    typeof value.pageLabel !== "string" ||
    typeof value.returnPath !== "string" ||
    !value.returnPath.startsWith("/") ||
    !Array.isArray(value.items)
  ) {
    return null;
  }

  const items = value.items
    .filter(
      (item) =>
        Boolean(item) &&
        !item.ephemeral &&
        typeof item.id === "string" &&
        item.id.length > 0 &&
        typeof item.label === "string" &&
        typeof item.isDirty === "boolean" &&
        typeof item.canSave === "boolean",
    )
    .map((item) => ({
      ...item,
      operation: (item.operation === "upload" || item.operation === "delete"
        ? item.operation
        : "save") as PageSaveItemState["operation"],
      selected: true,
    }));

  if (!hasDirtyItems(items)) return null;
  return { ...value, items };
}

function ignoreBackgroundPersistenceFailure(promise: Promise<void>): void {
  // The live registry remains authoritative for this session. The persistence
  // layer retries and serializes writes; a final storage failure must not turn
  // into an unhandled rejection that destabilizes the app shell.
  void promise.catch(() => undefined);
}

async function syncPersistedRegistration(
  registration: StoredRegistration,
): Promise<void> {
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

export function hydratePageSavePendingFromStorage(): Promise<void> {
  if (hydrated) return Promise.resolve();
  if (hydrationPromise) return hydrationPromise;

  hydrationPromise = (async () => {
    const records = await loadPageSavePendingRecords();

    for (const rawRecord of records) {
      const recordId =
        rawRecord && typeof rawRecord.id === "string" ? rawRecord.id : null;
      const record = normalizePersistedRecord(rawRecord);
      if (!record) {
        if (recordId) await deletePageSavePendingRecord(recordId);
        continue;
      }

      // A mounted scope is newer truth than a record loaded from IndexedDB.
      // Hydration can finish after React has already mounted/updated the page;
      // never let that older durable snapshot overwrite the live state.
      const live = registrations.get(record.id);
      if (live) {
        const liveItems = persistableItems(live.items);
        if (hasDirtyItems(liveItems)) {
          const liveRecord = buildPendingRecord(live, liveItems);
          persistedRecords.set(live.id, liveRecord);
          await persistPageSavePendingRecord(liveRecord);
        } else {
          persistedRecords.delete(record.id);
          await deletePageSavePendingRecord(record.id);
        }
        continue;
      }

      persistedRecords.set(record.id, record);
    }

    hydrated = true;
    emit();
  })().finally(() => {
    hydrationPromise = null;
  });

  return hydrationPromise;
}

export function registerPageSave(
  registration: PageSaveRegistrationInput,
): PageSaveRegistrationCleanup {
  const previous = registrations.get(registration.id);
  const registrationToken = nextRegistrationToken++;
  const stored: StoredRegistration = {
    ...registration,
    items: normalizeItems(registration.items, previous?.items),
    registrationToken,
    statusRevision: 0,
  };
  registrations.set(registration.id, stored);
  activeRegistrationId = registration.id;
  ignoreBackgroundPersistenceFailure(syncPersistedRegistration(stored));
  emit();

  const cleanup = (() => {
    const current = registrations.get(registration.id);
    if (!current || current.registrationToken !== registrationToken) return;
    registrations.delete(registration.id);
    if (activeRegistrationId === registration.id) {
      activeRegistrationId = [...registrations.keys()].at(-1) ?? null;
    }
    emit();
  }) as PageSaveRegistrationCleanup;
  cleanup.registrationToken = registrationToken;
  return cleanup;
}

export function updatePageSaveRegistration(
  id: string,
  patch: PageSaveStatusPatch,
  registrationToken?: number,
  statusRevision?: number,
): void {
  const current = registrations.get(id);
  if (!current) return;
  if (
    registrationToken !== undefined &&
    current.registrationToken !== registrationToken
  ) {
    return;
  }
  if (statusRevision !== undefined && statusRevision < current.statusRevision) {
    return;
  }

  const nextItems = applyHeldClean(
    id,
    patch.items ? normalizeItems(patch.items, current.items) : current.items,
    statusRevision,
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
    if (
      statusRevision !== undefined &&
      statusRevision > current.statusRevision
    ) {
      registrations.set(id, { ...current, statusRevision });
    }
    return;
  }

  const next: StoredRegistration = {
    ...current,
    label: nextLabel,
    returnPath: nextReturnPath,
    isSaving: nextIsSaving,
    canSave: nextCanSave,
    items: nextItems,
    statusRevision: statusRevision ?? current.statusRevision,
  };
  registrations.set(id, next);
  ignoreBackgroundPersistenceFailure(syncPersistedRegistration(next));
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
    ignoreBackgroundPersistenceFailure(
      syncPersistedRegistration({ ...current, items }),
    );
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
    ignoreBackgroundPersistenceFailure(
      persistPageSavePendingRecord(nextRecord),
    );
    emit();
  }
}

/**
 * Forgets specific items whose work cannot outlive the page — staged operations
 * hold in-memory executors, so a persisted record would point at nothing. Other
 * dirty items in the same scope keep their pending record.
 */
export async function dropPageSaveItems(
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
export function hydratePageSaveRecoveryFromStorage(): Promise<void> {
  if (recoveryHydrated) return Promise.resolve();
  if (recoveryHydrationPromise) return recoveryHydrationPromise;

  recoveryHydrationPromise = (async () => {
    const recovered = await recoverPageSaveJournal();
    interrupted = recovered.filter(
      (operation) =>
        operation.verdict === "needsConfirmation" ||
        operation.verdict === "failed",
    );
    recoveryHydrated = true;
    emit();
  })().finally(() => {
    recoveryHydrationPromise = null;
  });

  return recoveryHydrationPromise;
}

/**
 * Drops the recovered rows that a fresh attempt has just replaced.
 *
 * Unlike `acknowledgePageSaveInterruption` this deletes nothing from storage:
 * `openPageSaveJournalEntry` already rewrote each of these operations to
 * `running`, and deleting by id here would remove the live attempt's own entry.
 */
function supersedeInterrupted(entries: readonly PageSaveJournalEntry[]): void {
  if (interrupted.length === 0) return;
  const superseded = new Set(entries.map((entry) => entry.operationId));
  const next = interrupted.filter(
    (operation) => !superseded.has(operation.entry.operationId),
  );
  if (next.length === interrupted.length) return;
  interrupted = next;
  emit();
}

export function acknowledgePageSaveInterruption(operationId: string): void {
  const next = interrupted.filter(
    (operation) => operation.entry.operationId !== operationId,
  );
  if (next.length === interrupted.length) return;
  interrupted = next;
  ignoreBackgroundPersistenceFailure(
    acknowledgePageSaveJournalEntry(operationId),
  );
  emit();
}

export function openPageSaveDialog(): void {
  const snapshot = getPageSaveSnapshot();
  if (!snapshot.isDirty && snapshot.interrupted.length === 0) return;

  // Opening is allowed only when the modal can name actual dirty work or an
  // interrupted operation. A saving-only state never justifies an empty modal.
  const pending = buildDialogState();
  const hasListedWork = pending?.items.some((item) => item.isDirty) ?? false;
  if (!hasListedWork && snapshot.interrupted.length === 0) return;

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

export function markPageSaveExecuteAfterNavigation(
  registrationId: string,
): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(`page-save:execute:${registrationId}`, "1");
}

async function openJournalForSelection(
  registration: StoredRegistration,
  selectedIds: string[],
): Promise<PageSaveJournalEntry[]> {
  const selected = new Set(selectedIds);
  const journalled: PageSaveJournalEntry[] = [];

  try {
    for (const item of registration.items) {
      if (!selected.has(item.id)) continue;
      journalled.push(
        await openPageSaveJournalEntry({
          scopeId: registration.id,
          itemId: item.id,
          kind: item.operation,
          label: item.label,
          returnPath: registration.returnPath,
        }),
      );
    }
    return journalled;
  } catch (error) {
    // No page operation has run yet. Any journal rows opened before a later
    // journal write failed are therefore known failures, not ambiguous
    // `running` work that should alarm the user after restart.
    await Promise.allSettled(
      journalled.map((entry) =>
        settlePageSaveJournalEntry(entry, "failed", error),
      ),
    );
    throw error;
  }
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
    const current = registrations.get(active.id);
    if (current) {
      registrations.set(current.id, { ...current, isSaving: saving });
    }
    emit();
  };

  dialogOpen = false;
  markSaving(true);
  lastResult = null;

  const failAndReopen = (): void => {
    lastResult = "failure";
    markSaving(false);
    const pending = buildDialogState();
    dialogOpen = pending !== null || interrupted.length > 0;
    emit();
  };

  let journalled: PageSaveJournalEntry[] = [];
  const settleBestEffort = async (
    status: "succeeded" | "failed",
    error?: unknown,
  ): Promise<void> => {
    await Promise.allSettled(
      journalled.map((entry) =>
        settlePageSaveJournalEntry(entry, status, error),
      ),
    );
  };

  try {
    // Journal setup is part of accepting the operation. Failure here happens
    // before page work runs and must always restore a usable non-saving state.
    journalled = await openJournalForSelection(active, selectedIds);
    supersedeInterrupted(journalled);

    if (active.handle.prepareForSave) {
      const prepared = await active.handle.prepareForSave(selectedIds);
      if (!prepared) {
        await settleBestEffort("failed");
        failAndReopen();
        return false;
      }
    }

    const saved = await active.handle.save(selectedIds);
    if (!saved) {
      await settleBestEffort("failed");
      failAndReopen();
      return false;
    }

    // The page write is authoritative. Local cleanup failures must never turn
    // a successful write into a retry prompt, which could duplicate the write.
    await settleBestEffort("succeeded");

    const current = registrations.get(active.id);
    if (current) {
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
      markItemsHeldClean(active.id, selectedIds, active.statusRevision);
    }

    persistedRecords.delete(active.id);
    try {
      await deletePageSavePendingRecord(active.id);
    } catch {
      // The page write already succeeded. A local cleanup failure is retried by
      // the persistence layer and must never convert success into a duplicate
      // execution prompt.
    }
    dialogOpen = false;
    lastResult = "success";
    emit();
    return true;
  } catch (error) {
    await settleBestEffort("failed", error);
    failAndReopen();
    throw error;
  } finally {
    if (activeSaveExecutionId === active.id) {
      activeSaveExecutionId = null;
      const current = registrations.get(active.id);
      if (current?.isSaving) {
        registrations.set(active.id, { ...current, isSaving: false });
      }
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
  hydrationPromise = null;
  activeSaveExecutionId = null;
  lastResult = null;
  interrupted = [];
  recoveryHydrated = false;
  recoveryHydrationPromise = null;
  nextRegistrationToken = 1;
  heldCleanPasses.clear();
  listeners.clear();
  cachedSnapshot = IDLE_SNAPSHOT;
}
