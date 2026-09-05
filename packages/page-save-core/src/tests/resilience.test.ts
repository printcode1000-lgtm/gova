import assert from "node:assert/strict";

import {
  acknowledgePageSaveInterruption,
  configurePageSaveCore,
  executePageSave,
  getPageSaveSnapshot,
  hydratePageSavePendingFromStorage,
  hydratePageSaveRecoveryFromStorage,
  openPageSaveDialog,
  registerPageSave,
  resetPageSaveOperationsForTests,
  resetPageSavePersistenceForTests,
  resetPageSaveRegistryForTests,
  updatePageSaveRegistration,
  type PageSaveJournalEntry,
  type PageSavePendingRecord,
} from "../index";

function pendingRecord(
  id: string,
  overrides: Partial<PageSavePendingRecord> = {},
): PageSavePendingRecord {
  return {
    schemaVersion: 1,
    id,
    pageLabel: id,
    returnPath: `/${id}`,
    items: [
      {
        id: "details",
        label: "Details",
        operation: "save",
        isDirty: true,
        canSave: true,
        selected: true,
      },
    ],
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function createStorage(seed: PageSavePendingRecord[] = []) {
  const pending = new Map(seed.map((record) => [record.id, record]));
  const journal = new Map<string, PageSaveJournalEntry>();
  return {
    pending,
    journal,
    getPending: async (id: string) => pending.get(id),
    setPending: async (record: PageSavePendingRecord) => {
      pending.set(record.id, record);
    },
    deletePending: async (id: string) => {
      pending.delete(id);
    },
    listPending: async () => [...pending.values()],
    getJournalEntry: async (operationId: string) => journal.get(operationId),
    setJournalEntry: async (entry: PageSaveJournalEntry) => {
      journal.set(entry.operationId, entry);
    },
    deleteJournalEntry: async (operationId: string) => {
      journal.delete(operationId);
    },
    listJournalEntries: async () => [...journal.values()],
  };
}

function reset(): void {
  resetPageSaveRegistryForTests();
  resetPageSavePersistenceForTests();
  resetPageSaveOperationsForTests();
}

function cleanScope(id: string, label = id): () => void {
  return registerPageSave({
    id,
    label,
    returnPath: `/${id}`,
    items: [],
    isSaving: false,
    canSave: false,
    handle: { save: async () => true },
  });
}

function dirtyScope(
  id: string,
  save: () => Promise<boolean> = async () => true,
): () => void {
  return registerPageSave({
    id,
    label: id,
    returnPath: `/${id}`,
    items: [{ id: "details", label: "Details", isDirty: true, canSave: true }],
    isSaving: false,
    canSave: true,
    handle: { save },
  });
}

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  assert.fail("condition did not become true");
}

async function testCleanScopeCannotShadowPersistedWork() {
  reset();
  const storage = createStorage([pendingRecord("older-work")]);
  configurePageSaveCore({ storage });
  await hydratePageSavePendingFromStorage();
  cleanScope("current-clean", "Current clean page");

  const snapshot = getPageSaveSnapshot();
  assert.equal(snapshot.isDirty, true);
  assert.equal(snapshot.registrationId, "older-work");
  assert.equal(snapshot.label, "older-work");
  openPageSaveDialog();
  const opened = getPageSaveSnapshot();
  assert.equal(opened.dialogOpen, true);
  assert.equal(opened.dialog?.registrationId, "older-work");
  assert.equal(opened.dialog?.requiresNavigation, true);
  assert.equal(opened.dialog?.items.filter((item) => item.isDirty).length, 1);
}

async function testHydrationCannotOverwriteNewerCleanLiveState() {
  reset();
  const stale = pendingRecord("profile-edit");
  const storage = createStorage([stale]);
  let releaseList: (() => void) | null = null;
  storage.listPending = () =>
    new Promise<PageSavePendingRecord[]>((resolve) => {
      releaseList = () => resolve([stale]);
    });
  configurePageSaveCore({ storage });

  const hydration = hydratePageSavePendingFromStorage();
  await waitFor(() => releaseList !== null);
  cleanScope("profile-edit");
  releaseList!();
  await hydration;

  const snapshot = getPageSaveSnapshot();
  assert.equal(snapshot.isDirty, false);
  assert.equal(snapshot.hasPersistedPending, false);
  assert.equal(snapshot.registrationId, null);
  assert.equal(storage.pending.has("profile-edit"), false);
}

async function testPendingWritesCannotFinishOutOfOrder() {
  reset();
  const storage = createStorage();
  let releaseFirstSet: (() => void) | null = null;
  let deleteCalls = 0;
  storage.setPending = async (record) => {
    if (!releaseFirstSet) {
      await new Promise<void>((resolve) => {
        releaseFirstSet = resolve;
      });
    }
    storage.pending.set(record.id, record);
  };
  storage.deletePending = async (id) => {
    deleteCalls += 1;
    storage.pending.delete(id);
  };
  configurePageSaveCore({ storage });

  dirtyScope("ordered");
  await waitFor(() => releaseFirstSet !== null);
  updatePageSaveRegistration("ordered", {
    items: [{ id: "details", label: "Details", isDirty: false, canSave: true }],
    canSave: false,
  });
  assert.equal(deleteCalls, 0, "delete must wait behind the older set");
  releaseFirstSet!();
  await waitFor(() => deleteCalls > 0);
  assert.equal(storage.pending.has("ordered"), false);
}

async function testStaleCleanupCannotDeleteNewerRegistration() {
  reset();
  const unregisterOld = dirtyScope("same-id");
  const unregisterNew = registerPageSave({
    id: "same-id",
    label: "new registration",
    returnPath: "/same-id",
    items: [
      { id: "details", label: "New details", isDirty: true, canSave: true },
    ],
    isSaving: false,
    canSave: true,
    handle: { save: async () => true },
  });

  unregisterOld();
  const snapshot = getPageSaveSnapshot();
  assert.equal(snapshot.registrationId, "same-id");
  assert.equal(snapshot.label, "new registration");
  openPageSaveDialog();
  assert.equal(getPageSaveSnapshot().dialog?.pageLabel, "new registration");
  unregisterNew();
}

async function testJournalSetupFailureNeverLeavesSavingStuck() {
  reset();
  const storage = createStorage();
  storage.setJournalEntry = async () => {
    throw new Error("journal unavailable");
  };
  configurePageSaveCore({ storage });
  dirtyScope("journal-failure");
  openPageSaveDialog();

  await assert.rejects(() => executePageSave(), /journal unavailable/);
  const snapshot = getPageSaveSnapshot();
  assert.equal(snapshot.isSaving, false);
  assert.equal(snapshot.phase, "dirty");
  assert.equal(snapshot.dialogOpen, true);
  assert.equal(
    snapshot.dialog?.items.some((item) => item.isDirty),
    true,
  );
  assert.equal(snapshot.lastResult, "failure");
}

async function testSuccessfulWriteSurvivesJournalCleanupFailure() {
  reset();
  const storage = createStorage();
  let journalDeleteCalls = 0;
  storage.deleteJournalEntry = async (operationId) => {
    journalDeleteCalls += 1;
    if (journalDeleteCalls <= 3)
      throw new Error("temporary journal delete failure");
    storage.journal.delete(operationId);
  };
  configurePageSaveCore({ storage });
  dirtyScope("success-cleanup");
  openPageSaveDialog();

  assert.equal(await executePageSave(), true);
  const snapshot = getPageSaveSnapshot();
  assert.equal(snapshot.isDirty, false);
  assert.equal(snapshot.isSaving, false);
  assert.equal(snapshot.dialogOpen, false);
  assert.equal(snapshot.lastResult, "success");
  assert.equal(
    [...storage.journal.values()][0]?.status,
    "succeeded",
    "failed delete falls back to a durable succeeded marker",
  );

  resetPageSaveRegistryForTests();
  await hydratePageSaveRecoveryFromStorage();
  assert.deepEqual(getPageSaveSnapshot().interrupted, []);
  assert.equal(storage.journal.size, 0, "recovery prunes the succeeded marker");
}

async function testCorruptAndUnrunnablePendingRecordsArePruned() {
  reset();
  const corruptPath = pendingRecord("bad-path", {
    returnPath: "https://example.invalid/escape",
  });
  const ephemeralOnly = pendingRecord("ephemeral-only", {
    items: [
      {
        id: "delete",
        label: "Delete",
        operation: "delete",
        ephemeral: true,
        isDirty: true,
        canSave: true,
        selected: true,
      },
    ],
  });
  const storage = createStorage([corruptPath, ephemeralOnly]);
  configurePageSaveCore({ storage });

  await hydratePageSavePendingFromStorage();
  const snapshot = getPageSaveSnapshot();
  assert.equal(snapshot.isDirty, false);
  assert.equal(snapshot.hasPersistedPending, false);
  assert.equal(storage.pending.size, 0);
}

async function testHydrationCanRetryAfterStorageFailure() {
  reset();
  const storage = createStorage([pendingRecord("retry")]);
  let listAttempts = 0;
  storage.listPending = async () => {
    listAttempts += 1;
    if (listAttempts <= 3) throw new Error("indexeddb warming up");
    return [...storage.pending.values()];
  };
  configurePageSaveCore({ storage });

  const first = hydratePageSavePendingFromStorage();
  const concurrent = hydratePageSavePendingFromStorage();
  assert.equal(first, concurrent, "concurrent hydration shares one attempt");
  await assert.rejects(() => first, /indexeddb warming up/);

  await hydratePageSavePendingFromStorage();
  assert.equal(getPageSaveSnapshot().registrationId, "retry");
  assert.equal(getPageSaveSnapshot().isDirty, true);
}

async function testUnmountDuringSaveKeepsGlobalSavingState() {
  reset();
  const storage = createStorage();
  configurePageSaveCore({ storage });
  let releaseSave: (() => void) | null = null;
  let saveStarted = false;
  const unregister = dirtyScope("in-flight", async () => {
    saveStarted = true;
    await new Promise<void>((resolve) => {
      releaseSave = resolve;
    });
    return true;
  });
  openPageSaveDialog();
  const execution = executePageSave();
  await waitFor(() => saveStarted);

  unregister();
  const during = getPageSaveSnapshot();
  assert.equal(during.isSaving, true);
  assert.equal(during.phase, "saving");
  assert.equal(during.registrationId, "in-flight");

  releaseSave!();
  assert.equal(await execution, true);
  const after = getPageSaveSnapshot();
  assert.equal(after.isSaving, false);
  assert.equal(after.isDirty, false);
}

async function testSourceTransitionsRemainConsistentAcrossMultipleScopes() {
  reset();
  const storage = createStorage([pendingRecord("older")]);
  configurePageSaveCore({ storage });
  await hydratePageSavePendingFromStorage();
  dirtyScope("live-dirty");
  cleanScope("latest-clean");

  assert.equal(getPageSaveSnapshot().registrationId, "live-dirty");
  openPageSaveDialog();
  assert.equal(getPageSaveSnapshot().dialog?.registrationId, "live-dirty");
  assert.equal(await executePageSave(), true);

  const next = getPageSaveSnapshot();
  assert.equal(next.registrationId, "older");
  assert.equal(next.isDirty, true);
  openPageSaveDialog();
  assert.equal(getPageSaveSnapshot().dialog?.registrationId, "older");
  assert.equal(getPageSaveSnapshot().dialog?.requiresNavigation, true);
}

async function testConflictingDuplicateItemIdsFailClosed() {
  reset();
  let saveCalls = 0;
  registerPageSave({
    id: "duplicate-items",
    label: "Duplicate items",
    returnPath: "/duplicate-items",
    items: [
      {
        id: "same",
        label: "Form save",
        operation: "save",
        isDirty: true,
        canSave: true,
      },
      {
        id: "same",
        label: "Delete",
        operation: "delete",
        ephemeral: true,
        isDirty: true,
        canSave: true,
      },
    ],
    isSaving: false,
    canSave: true,
    handle: {
      save: async () => {
        saveCalls += 1;
        return true;
      },
    },
  });

  openPageSaveDialog();
  const dialog = getPageSaveSnapshot().dialog;
  assert.equal(dialog?.items.length, 1, "duplicate ids collapse to one row");
  assert.equal(
    dialog?.items[0]?.canSave,
    false,
    "conflicting duplicates are blocked",
  );
  assert.equal(dialog?.canSave, false);
  assert.equal(await executePageSave(), false);
  assert.equal(saveCalls, 0, "ambiguous duplicate work must never execute");
}

async function testEphemeralTransitionIsNeverIgnored() {
  reset();
  const storage = createStorage();
  configurePageSaveCore({ storage });
  const registration = registerPageSave({
    id: "ephemeral-transition",
    label: "Transition",
    returnPath: "/ephemeral-transition",
    items: [{ id: "same", label: "Same", isDirty: true, canSave: true }],
    isSaving: false,
    canSave: true,
    handle: { save: async () => true },
  });
  await waitFor(() => storage.pending.has("ephemeral-transition"));

  updatePageSaveRegistration(
    "ephemeral-transition",
    {
      items: [
        {
          id: "same",
          label: "Same",
          ephemeral: true,
          isDirty: true,
          canSave: true,
        },
      ],
    },
    registration.registrationToken,
    2,
  );

  await waitFor(() => !storage.pending.has("ephemeral-transition"));
  openPageSaveDialog();
  assert.equal(getPageSaveSnapshot().dialog?.items[0]?.ephemeral, true);
  assert.equal(getPageSaveSnapshot().hasPersistedPending, false);
}

async function testOlderReactRevisionCannotOverwriteNewerState() {
  reset();
  const registration = registerPageSave({
    id: "revision-order",
    label: "initial",
    returnPath: "/revision-order",
    items: [{ id: "details", label: "Details", isDirty: true, canSave: true }],
    isSaving: false,
    canSave: true,
    handle: { save: async () => true },
  });

  updatePageSaveRegistration(
    "revision-order",
    { label: "revision-5" },
    registration.registrationToken,
    5,
  );
  updatePageSaveRegistration(
    "revision-order",
    { label: "stale-revision-4" },
    registration.registrationToken,
    4,
  );
  assert.equal(getPageSaveSnapshot().label, "revision-5");
}

async function testNewEditAfterSaveBypassesHeldCleanSuppression() {
  reset();
  const registration = registerPageSave({
    id: "post-save-edit",
    label: "Post-save edit",
    returnPath: "/post-save-edit",
    items: [{ id: "details", label: "Details", isDirty: true, canSave: true }],
    isSaving: false,
    canSave: true,
    handle: { save: async () => true },
  });
  updatePageSaveRegistration(
    "post-save-edit",
    {
      items: [
        { id: "details", label: "Details", isDirty: true, canSave: true },
      ],
    },
    registration.registrationToken,
    10,
  );

  openPageSaveDialog();
  assert.equal(await executePageSave(), true);
  assert.equal(getPageSaveSnapshot().isDirty, false);

  updatePageSaveRegistration(
    "post-save-edit",
    {
      items: [
        { id: "details", label: "Details", isDirty: true, canSave: true },
      ],
      canSave: true,
    },
    registration.registrationToken,
    11,
  );
  assert.equal(
    getPageSaveSnapshot().isDirty,
    true,
    "a render created after the save began is new work and must show immediately",
  );
}

async function testStaleUpdateCannotOverwriteNewerRegistration() {
  reset();
  const oldRegistration = registerPageSave({
    id: "lease",
    label: "old",
    returnPath: "/lease",
    items: [{ id: "details", label: "Old", isDirty: true, canSave: true }],
    isSaving: false,
    canSave: true,
    handle: { save: async () => true },
  });
  const newRegistration = registerPageSave({
    id: "lease",
    label: "new",
    returnPath: "/lease",
    items: [{ id: "details", label: "New", isDirty: true, canSave: true }],
    isSaving: false,
    canSave: true,
    handle: { save: async () => true },
  });

  updatePageSaveRegistration(
    "lease",
    { label: "stale update" },
    oldRegistration.registrationToken,
  );
  assert.equal(getPageSaveSnapshot().label, "new");

  updatePageSaveRegistration(
    "lease",
    { label: "fresh update" },
    newRegistration.registrationToken,
  );
  assert.equal(getPageSaveSnapshot().label, "fresh update");
}

async function testJournalAcknowledgeCannotDeleteANewerAttempt() {
  reset();
  const storage = createStorage();
  const operationId = "journal-race::details";
  storage.journal.set(operationId, {
    schemaVersion: 1,
    operationId,
    idempotencyKey: "old-key",
    scopeId: "journal-race",
    itemId: "details",
    kind: "save",
    label: "Details",
    returnPath: "/journal-race",
    status: "running",
    attempts: 1,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  let releaseAcknowledgeDelete: (() => void) | null = null;
  let firstDelete = true;
  storage.deleteJournalEntry = async (id) => {
    if (firstDelete) {
      firstDelete = false;
      await new Promise<void>((resolve) => {
        releaseAcknowledgeDelete = resolve;
      });
    }
    storage.journal.delete(id);
  };
  configurePageSaveCore({ storage });
  await hydratePageSaveRecoveryFromStorage();

  let releaseSave: (() => void) | null = null;
  let saveStarted = false;
  dirtyScope("journal-race", async () => {
    saveStarted = true;
    await new Promise<void>((resolve) => {
      releaseSave = resolve;
    });
    return true;
  });

  acknowledgePageSaveInterruption(operationId);
  await waitFor(() => releaseAcknowledgeDelete !== null);
  openPageSaveDialog();
  const execution = executePageSave();
  await Promise.resolve();
  assert.equal(
    saveStarted,
    false,
    "a retry must wait for the older acknowledgement mutation",
  );

  releaseAcknowledgeDelete!();
  await waitFor(() => saveStarted);
  assert.equal(
    storage.journal.get(operationId)?.status,
    "running",
    "the new in-flight journal row must survive the older acknowledgement",
  );
  releaseSave!();
  assert.equal(await execution, true);
  assert.equal(storage.journal.has(operationId), false);
}

async function testDialogAutoClosesWhenItsLastDirtyItemDisappears() {
  reset();
  dirtyScope("undo-while-open");
  openPageSaveDialog();
  assert.equal(getPageSaveSnapshot().dialogOpen, true);

  updatePageSaveRegistration("undo-while-open", {
    items: [{ id: "details", label: "Details", isDirty: false, canSave: true }],
    canSave: false,
  });

  const snapshot = getPageSaveSnapshot();
  assert.equal(snapshot.dialogOpen, false);
  assert.equal(snapshot.dialog, null);
  assert.equal(snapshot.isDirty, false);
}

async function testSavingOnlyStateCannotOpenEmptyDialog() {
  reset();
  registerPageSave({
    id: "saving-clean",
    label: "Saving clean",
    returnPath: "/saving-clean",
    items: [],
    isSaving: true,
    canSave: false,
    handle: { save: async () => true },
  });

  const before = getPageSaveSnapshot();
  assert.equal(before.isSaving, true);
  assert.equal(before.isDirty, false);
  openPageSaveDialog();
  const after = getPageSaveSnapshot();
  assert.equal(after.dialogOpen, false);
  assert.equal(after.dialog, null);
}

async function main() {
  await testCleanScopeCannotShadowPersistedWork();
  await testHydrationCannotOverwriteNewerCleanLiveState();
  await testPendingWritesCannotFinishOutOfOrder();
  await testStaleCleanupCannotDeleteNewerRegistration();
  await testJournalSetupFailureNeverLeavesSavingStuck();
  await testSuccessfulWriteSurvivesJournalCleanupFailure();
  await testCorruptAndUnrunnablePendingRecordsArePruned();
  await testHydrationCanRetryAfterStorageFailure();
  await testUnmountDuringSaveKeepsGlobalSavingState();
  await testSourceTransitionsRemainConsistentAcrossMultipleScopes();
  await testConflictingDuplicateItemIdsFailClosed();
  await testEphemeralTransitionIsNeverIgnored();
  await testOlderReactRevisionCannotOverwriteNewerState();
  await testNewEditAfterSaveBypassesHeldCleanSuppression();
  await testStaleUpdateCannotOverwriteNewerRegistration();
  await testJournalAcknowledgeCannotDeleteANewerAttempt();
  await testDialogAutoClosesWhenItsLastDirtyItemDisappears();
  await testSavingOnlyStateCannotOpenEmptyDialog();
  console.log("page-save resilience tests passed.");
}

void main();
