import assert from "node:assert/strict";

import {
  acknowledgePageSaveInterruption,
  buildPageSaveOperationId,
  closePageSaveDialog,
  configurePageSaveCore,
  executePageSave,
  getPageSaveSnapshot,
  hydratePageSaveRecoveryFromStorage,
  openPageSaveDialog,
  registerPageSave,
  resetPageSaveOperationsForTests,
  resetPageSavePersistenceForTests,
  resetPageSaveRegistryForTests,
  PAGE_SAVE_JOURNAL_SCHEMA_VERSION,
  type PageSaveJournalEntry,
  type PageSavePendingRecord,
} from "../index";

/**
 * The journal exists so an interruption leaves evidence. These tests pin what
 * the next session is allowed to conclude from that evidence — above all, that
 * a request whose answer never arrived is never replayed on its own.
 */

function createStorage() {
  const pending = new Map<string, PageSavePendingRecord>();
  const journal = new Map<string, PageSaveJournalEntry>();
  return {
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

function reset() {
  resetPageSaveRegistryForTests();
  resetPageSavePersistenceForTests();
  resetPageSaveOperationsForTests();
}

const item = {
  id: "product-details",
  label: "Product details",
  isDirty: true,
  canSave: true,
};

function scope(save: () => Promise<boolean>) {
  registerPageSave({
    id: "product-edit",
    label: "Product",
    returnPath: "/product?mode=edit",
    items: [item],
    isSaving: false,
    canSave: true,
    handle: { save },
  });
}

async function testSuccessLeavesNothingToReplay() {
  reset();
  const storage = createStorage();
  configurePageSaveCore({ storage });
  scope(async () => true);

  openPageSaveDialog();
  assert.equal(await executePageSave(), true);
  assert.deepEqual(
    [...storage.journal.keys()],
    [],
    "a completed operation must not survive as a replayable record",
  );
}

async function testFailureIsRecordedAndRetryable() {
  reset();
  const storage = createStorage();
  configurePageSaveCore({ storage });
  scope(async () => false);

  openPageSaveDialog();
  assert.equal(await executePageSave(), false);
  closePageSaveDialog();

  const entry = storage.journal.get(
    buildPageSaveOperationId("product-edit", "product-details"),
  );
  assert.equal(entry?.status, "failed");
  assert.equal(entry?.attempts, 1);
  assert.equal(entry?.kind, "save");
  assert.equal(entry?.returnPath, "/product?mode=edit");

  // A second attempt is the same intent, so the idempotency key must not move.
  const firstKey = entry!.idempotencyKey;
  scope(async () => false);
  openPageSaveDialog();
  await executePageSave();
  closePageSaveDialog();

  const retried = storage.journal.get(entry!.operationId);
  assert.equal(retried?.idempotencyKey, firstKey, "a retry keeps its key");
  assert.equal(retried?.attempts, 2);
}

async function testThrownErrorIsRecordedNotSwallowed() {
  reset();
  const storage = createStorage();
  configurePageSaveCore({ storage });
  scope(async () => {
    throw new Error("turso unreachable");
  });

  openPageSaveDialog();
  await assert.rejects(() => executePageSave(), /turso unreachable/);
  const entry = storage.journal.get(
    buildPageSaveOperationId("product-edit", "product-details"),
  );
  assert.equal(entry?.status, "failed");
  assert.equal(entry?.error, "turso unreachable");
  closePageSaveDialog();
}

async function testInterruptedRequestNeedsConfirmationAndIsNeverReplayed() {
  reset();
  const storage = createStorage();
  // What a crash between "request sent" and "answer received" leaves behind.
  storage.journal.set("product-edit::product-images", {
    schemaVersion: PAGE_SAVE_JOURNAL_SCHEMA_VERSION,
    operationId: "product-edit::product-images",
    idempotencyKey: "key-1",
    scopeId: "product-edit",
    itemId: "product-images",
    kind: "upload",
    label: "Product images",
    returnPath: "/product?mode=edit",
    status: "running",
    attempts: 1,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  configurePageSaveCore({ storage });

  await hydratePageSaveRecoveryFromStorage();

  const snapshot = getPageSaveSnapshot();
  assert.equal(snapshot.interrupted.length, 1);
  const [recovered] = snapshot.interrupted;
  assert.equal(recovered?.verdict, "needsConfirmation");
  assert.equal(
    recovered?.safeToRetry,
    false,
    "an in-flight upload may already have landed; it must not be replayed",
  );
  assert.ok(
    storage.journal.has("product-edit::product-images"),
    "an unresolved entry stays until the user resolves it",
  );

  // The header must show, and the dialog must open, with no dirty page at all.
  assert.equal(snapshot.isDirty, false);
  openPageSaveDialog();
  assert.equal(getPageSaveSnapshot().dialogOpen, true);
  closePageSaveDialog();

  acknowledgePageSaveInterruption("product-edit::product-images");
  assert.deepEqual(getPageSaveSnapshot().interrupted, []);
  await Promise.resolve();
  assert.equal(storage.journal.has("product-edit::product-images"), false);
}

/**
 * A re-run answers the question the recovered row was asking.
 *
 * Before this, the row survived its own replacement: the header icon stayed lit
 * and the dialog reopened after a save the user had just completed, on an
 * acknowledgement that no longer described anything in storage.
 */
async function testRerunClearsTheRowItReplaces() {
  reset();
  const storage = createStorage();
  const operationId = buildPageSaveOperationId("product-edit", "product-details");
  storage.journal.set(operationId, {
    schemaVersion: PAGE_SAVE_JOURNAL_SCHEMA_VERSION,
    operationId,
    idempotencyKey: "key-3",
    scopeId: "product-edit",
    itemId: "product-details",
    kind: "save",
    label: "Product details",
    returnPath: "/product?mode=edit",
    status: "running",
    attempts: 1,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  configurePageSaveCore({ storage });

  await hydratePageSaveRecoveryFromStorage();
  assert.equal(getPageSaveSnapshot().interrupted.length, 1);

  scope(async () => true);
  openPageSaveDialog();
  assert.equal(await executePageSave(), true);

  const after = getPageSaveSnapshot();
  assert.deepEqual(
    after.interrupted,
    [],
    "the re-run replaced the entry, so nothing is left to acknowledge",
  );
  assert.equal(after.dialogOpen, false);
  assert.equal(storage.journal.has(operationId), false);

  // Nothing keeps the header on screen: no dirty work, no pending record, no row.
  assert.equal(after.isDirty, false);
  assert.equal(after.hasPersistedPending, false);
}

async function testNeverStartedWorkIsDiscardedNotResurrected() {
  reset();
  const storage = createStorage();
  storage.journal.set("data-health::purge", {
    schemaVersion: PAGE_SAVE_JOURNAL_SCHEMA_VERSION,
    operationId: "data-health::purge",
    idempotencyKey: "key-2",
    scopeId: "data-health",
    itemId: "purge",
    kind: "delete",
    label: "Purge orders",
    returnPath: "/super-admin/data-health",
    status: "pending",
    attempts: 0,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  configurePageSaveCore({ storage });

  await hydratePageSaveRecoveryFromStorage();
  assert.deepEqual(
    getPageSaveSnapshot().interrupted,
    [],
    "work that never left the device raises no question",
  );
  assert.equal(storage.journal.has("data-health::purge"), false);
}

async function main() {
  await testSuccessLeavesNothingToReplay();
  await testFailureIsRecordedAndRetryable();
  await testThrownErrorIsRecordedNotSwallowed();
  await testInterruptedRequestNeedsConfirmationAndIsNeverReplayed();
  await testRerunClearsTheRowItReplaces();
  await testNeverStartedWorkIsDiscardedNotResurrected();
  console.log("page-save journal recovery tests passed.");
}

void main();
