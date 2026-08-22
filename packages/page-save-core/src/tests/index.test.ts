import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import pkg from "../../package.json" with { type: "json" };

import {
  closePageSaveDialog,
  configurePageSaveCore,
  executePageSave,
  getPageSaveSnapshot,
  hydratePageSavePendingFromStorage,
  openPageSaveDialog,
  registerPageSave,
  resetPageSavePersistenceForTests,
  resetPageSaveRegistryForTests,
  setPageSaveItemSelected,
  subscribePageSave,
  updatePageSaveRegistration,
  buildPageSaveOperationItems,
  clearPageSaveOperations,
  dropPageSaveItems,
  listPageSaveOperations,
  resetPageSaveOperationsForTests,
  runPageSaveOperations,
  stagePageSaveOperation,
  unstagePageSaveOperation,
} from "../index";

function createMemoryStorage() {
  const store = new Map<string, import("../domain/page-save.types").PageSavePendingRecord>();
  const journal = new Map<string, import("../domain/page-save-journal.types").PageSaveJournalEntry>();
  return {
    store,
    journal,
    getPending: async (id: string) => store.get(id),
    setPending: async (record: import("../domain/page-save.types").PageSavePendingRecord) => {
      store.set(record.id, record);
    },
    deletePending: async (id: string) => {
      store.delete(id);
    },
    listPending: async () => [...store.values()],
    getJournalEntry: async (operationId: string) => journal.get(operationId),
    setJournalEntry: async (
      entry: import("../domain/page-save-journal.types").PageSaveJournalEntry,
    ) => {
      journal.set(entry.operationId, entry);
    },
    deleteJournalEntry: async (operationId: string) => {
      journal.delete(operationId);
    },
    listJournalEntries: async () => [...journal.values()],
  };
}

async function testRegistryLifecycle() {
  resetPageSaveRegistryForTests();
  resetPageSavePersistenceForTests();

  let saveCalls: string[][] = [];
  const unregister = registerPageSave({
    id: "profile-edit",
    label: "Profile",
    returnPath: "/profile?mode=edit",
    items: [
      {
        id: "registration",
        label: "Registration",
        isDirty: true,
        canSave: true,
      },
    ],
    isSaving: false,
    canSave: true,
    handle: {
      save: async (selectedItemIds) => {
        saveCalls.push(selectedItemIds);
        return true;
      },
    },
  });

  assert.equal(getPageSaveSnapshot().phase, "dirty");
  assert.equal(getPageSaveSnapshot().registrationId, "profile-edit");

  updatePageSaveRegistration("profile-edit", { isSaving: true });
  assert.equal(getPageSaveSnapshot().phase, "saving");

  updatePageSaveRegistration("profile-edit", { isSaving: false });
  openPageSaveDialog();
  assert.equal(getPageSaveSnapshot().dialogOpen, true);
  assert.equal(await executePageSave(), true);
  assert.deepEqual(saveCalls, [["registration"]]);
  assert.equal(getPageSaveSnapshot().dialogOpen, false);

  unregister();
  assert.equal(getPageSaveSnapshot().phase, "idle");
}

async function testPrepareForSaveGate() {
  resetPageSaveRegistryForTests();
  resetPageSavePersistenceForTests();

  registerPageSave({
    id: "product-edit",
    label: "Product",
    returnPath: "/product?mode=edit",
    items: [
      {
        id: "details",
        label: "Details",
        isDirty: true,
        canSave: true,
      },
    ],
    isSaving: false,
    canSave: true,
    handle: {
      prepareForSave: async () => false,
      save: async () => true,
    },
  });

  openPageSaveDialog();
  assert.equal(await executePageSave(), false);
}

async function testItemSelection() {
  resetPageSaveRegistryForTests();
  resetPageSavePersistenceForTests();

  registerPageSave({
    id: "profile-edit",
    label: "Profile",
    returnPath: "/profile?mode=edit",
    items: [
      {
        id: "registration",
        label: "Registration",
        isDirty: true,
        canSave: true,
      },
      {
        id: "store",
        label: "Store",
        isDirty: true,
        canSave: true,
      },
    ],
    isSaving: false,
    canSave: true,
    handle: {
      save: async (selectedItemIds) => selectedItemIds.length === 1,
    },
  });

  setPageSaveItemSelected("profile-edit", "store", false);
  openPageSaveDialog();
  assert.equal(await executePageSave(), true);
}

async function testPersistenceHydration() {
  resetPageSaveRegistryForTests();
  resetPageSavePersistenceForTests();
  configurePageSaveCore({ storage: createMemoryStorage() });

  registerPageSave({
    id: "profile-edit",
    label: "Profile",
    returnPath: "/profile?mode=edit",
    items: [
      {
        id: "registration",
        label: "Registration",
        isDirty: true,
        canSave: true,
      },
    ],
    isSaving: false,
    canSave: true,
    handle: { save: async () => true },
  });

  await new Promise((resolve) => setTimeout(resolve, 0));
  await hydratePageSavePendingFromStorage();
  assert.equal(getPageSaveSnapshot().hasPersistedPending, true);

  resetPageSaveRegistryForTests();
  await hydratePageSavePendingFromStorage();
  assert.equal(getPageSaveSnapshot().isDirty, true);
  assert.equal(getPageSaveSnapshot().registrationId, "profile-edit");

  openPageSaveDialog();
  assert.equal(getPageSaveSnapshot().dialog?.requiresNavigation, true);
  closePageSaveDialog();
}

function testSnapshotReferentialStability() {
  resetPageSaveRegistryForTests();
  resetPageSavePersistenceForTests();

  const first = getPageSaveSnapshot();
  const second = getPageSaveSnapshot();
  assert.equal(first, second);

  registerPageSave({
    id: "profile-edit",
    label: "Profile",
    returnPath: "/profile?mode=edit",
    items: [
      {
        id: "registration",
        label: "Registration",
        isDirty: true,
        canSave: true,
      },
    ],
    isSaving: false,
    canSave: true,
    handle: { save: async () => true },
  });

  const dirty = getPageSaveSnapshot();
  assert.notEqual(dirty, first);
  assert.equal(getPageSaveSnapshot(), dirty);

  updatePageSaveRegistration("profile-edit", {
    items: [
      {
        id: "registration",
        label: "Registration",
        isDirty: true,
        canSave: true,
      },
    ],
    isSaving: false,
    canSave: true,
  });
  assert.equal(getPageSaveSnapshot(), dirty);
}

function testSubscribe() {
  resetPageSaveRegistryForTests();
  resetPageSavePersistenceForTests();

  let notifications = 0;
  const unsubscribe = subscribePageSave(() => {
    notifications += 1;
  });

  registerPageSave({
    id: "hero-slider",
    label: "Hero",
    returnPath: "/super-admin/hero-slider",
    items: [],
    isSaving: false,
    canSave: false,
    handle: { save: async () => true },
  });
  assert.equal(notifications, 1);

  updatePageSaveRegistration("hero-slider", {
    items: [
      {
        id: "hero-slider",
        label: "Hero",
        isDirty: true,
        canSave: true,
      },
    ],
    canSave: true,
  });
  assert.equal(notifications, 2);

  unsubscribe();
  updatePageSaveRegistration("hero-slider", { isSaving: true });
  assert.equal(notifications, 2);
}

function testPackageSeal() {
  const root = process.cwd();
  assert.deepEqual(Object.keys(pkg.exports), ["."]);
  const source = readFileSync(
    path.join(root, "packages/page-save-core/src/index.ts"),
    "utf8",
  );
  assert.match(source, /executePageSave/);
  assert.match(source, /registerPageSave/);
  assert.match(source, /hydratePageSavePendingFromStorage/);
}

async function testDefaultSelectedTrue() {
  resetPageSaveRegistryForTests();
  resetPageSavePersistenceForTests();

  registerPageSave({
    id: "profile-edit",
    label: "Profile",
    returnPath: "/profile?mode=edit",
    items: [
      {
        id: "registration",
        label: "Registration",
        isDirty: true,
        canSave: true,
      },
      {
        id: "store",
        label: "Store",
        isDirty: true,
        canSave: true,
      },
    ],
    isSaving: false,
    canSave: true,
    handle: { save: async () => true },
  });

  openPageSaveDialog();
  const dialog = getPageSaveSnapshot().dialog;
  assert.equal(dialog?.items.every((item) => item.selected), true);
  closePageSaveDialog();
}

async function testMarkCleanAfterSave() {
  resetPageSaveRegistryForTests();
  resetPageSavePersistenceForTests();

  registerPageSave({
    id: "product-edit",
    label: "Product",
    returnPath: "/product?mode=edit",
    items: [
      {
        id: "product-images",
        label: "Images",
        isDirty: true,
        canSave: true,
      },
    ],
    isSaving: false,
    canSave: true,
    handle: { save: async () => true },
  });

  openPageSaveDialog();
  assert.equal(await executePageSave(), true);
  assert.equal(getPageSaveSnapshot().phase, "idle");
  assert.equal(getPageSaveSnapshot().isDirty, false);
}

async function testHeldCleanAfterSave() {
  resetPageSaveRegistryForTests();
  resetPageSavePersistenceForTests();

  registerPageSave({
    id: "product-edit",
    label: "Product",
    returnPath: "/product?mode=edit",
    items: [
      {
        id: "product-images",
        label: "Images",
        isDirty: true,
        canSave: true,
      },
    ],
    isSaving: false,
    canSave: true,
    handle: { save: async () => true },
  });

  openPageSaveDialog();
  assert.equal(await executePageSave(), true);
  assert.equal(getPageSaveSnapshot().phase, "idle");

  updatePageSaveRegistration("product-edit", {
    items: [
      {
        id: "product-images",
        label: "Images",
        isDirty: true,
        canSave: true,
      },
    ],
    isSaving: false,
    canSave: true,
  });
  assert.equal(getPageSaveSnapshot().phase, "idle");

  updatePageSaveRegistration("product-edit", {
    items: [
      {
        id: "product-images",
        label: "Images",
        isDirty: true,
        canSave: true,
      },
    ],
    isSaving: false,
    canSave: true,
  });
  assert.equal(getPageSaveSnapshot().phase, "dirty");
}

async function testSaveClearsSavingDespiteStalePageUpdate() {
  resetPageSaveRegistryForTests();
  resetPageSavePersistenceForTests();

  registerPageSave({
    id: "profile-edit",
    label: "Profile",
    returnPath: "/profile?mode=edit",
    items: [
      {
        id: "registration",
        label: "Registration",
        isDirty: true,
        canSave: true,
      },
    ],
    isSaving: false,
    canSave: true,
    handle: {
      save: async () => {
        updatePageSaveRegistration("profile-edit", { isSaving: true });
        return true;
      },
    },
  });

  openPageSaveDialog();
  assert.equal(await executePageSave(), true);
  assert.equal(getPageSaveSnapshot().isSaving, false);
  assert.equal(getPageSaveSnapshot().phase, "idle");
}

async function testStagedOperationsRunThroughRegistry() {
  resetPageSaveRegistryForTests();
  resetPageSavePersistenceForTests();
  resetPageSaveOperationsForTests();

  const executed: string[] = [];
  stagePageSaveOperation({
    scopeId: "data-health",
    itemId: "delete-image",
    kind: "delete",
    label: "Delete image",
    execute: async () => {
      executed.push("delete-image");
    },
  });
  stagePageSaveOperation({
    scopeId: "data-health",
    itemId: "clear-history",
    kind: "delete",
    label: "Clear history",
    execute: async () => false,
  });

  const items = buildPageSaveOperationItems("data-health");
  assert.equal(items.length, 2);
  assert.equal(items[0]?.operation, "delete");
  assert.equal(
    buildPageSaveOperationItems("data-health"),
    items,
    "item lists must be referentially stable between reads",
  );

  registerPageSave({
    id: "data-health",
    label: "Data health",
    returnPath: "/super-admin/data-health",
    items,
    isSaving: false,
    canSave: true,
    handle: {
      save: (selectedItemIds) =>
        runPageSaveOperations("data-health", selectedItemIds),
    },
  });

  openPageSaveDialog();
  assert.equal(await executePageSave(), false, "a failed operation fails the save");
  assert.deepEqual(executed, ["delete-image"]);
  assert.deepEqual(
    listPageSaveOperations("data-health").map((operation) => operation.itemId),
    ["clear-history"],
    "only the failed operation stays staged",
  );
  assert.equal(getPageSaveSnapshot().lastResult, "failure");

  unstagePageSaveOperation("data-health", "clear-history");
  assert.deepEqual(listPageSaveOperations("data-health"), []);
}

async function testDropPageSaveItemsKeepsOtherPendingWork() {
  resetPageSaveRegistryForTests();
  resetPageSavePersistenceForTests();
  resetPageSaveOperationsForTests();
  configurePageSaveCore({ storage: createMemoryStorage() });

  stagePageSaveOperation({
    scopeId: "profile-edit",
    itemId: "product-delete:1",
    kind: "delete",
    label: "Delete product",
    execute: async () => true,
  });

  registerPageSave({
    id: "profile-edit",
    label: "Profile",
    returnPath: "/profile?mode=edit",
    items: [
      { id: "registration", label: "Registration", isDirty: true, canSave: true },
      ...buildPageSaveOperationItems("profile-edit"),
    ],
    isSaving: false,
    canSave: true,
    handle: { save: async () => true },
  });

  await Promise.resolve();
  dropPageSaveItems("profile-edit", clearPageSaveOperations("profile-edit"));

  const snapshot = getPageSaveSnapshot();
  assert.equal(snapshot.isDirty, true, "the form section stays dirty");
  assert.equal(snapshot.hasPersistedPending, true);
  openPageSaveDialog();
  assert.deepEqual(
    getPageSaveSnapshot().dialog?.items.map((item) => item.id),
    ["registration"],
    "the staged operation is gone but the section survives",
  );
  closePageSaveDialog();
}

async function testRestagingTheSameOperationShowsTheIcon() {
  resetPageSaveRegistryForTests();
  resetPageSavePersistenceForTests();
  resetPageSaveOperationsForTests();

  const stageClear = () =>
    stagePageSaveOperation({
      scopeId: "super-admin-logs",
      itemId: "system-logs-clear-all",
      kind: "delete",
      label: "Clear all logs",
      execute: async () => true,
    });
  const syncFromReact = () =>
    updatePageSaveRegistration("super-admin-logs", {
      label: "Logs",
      returnPath: "/super-admin/logs",
      items: buildPageSaveOperationItems("super-admin-logs"),
      isSaving: false,
      canSave: true,
    });

  stageClear();
  registerPageSave({
    id: "super-admin-logs",
    label: "Logs",
    returnPath: "/super-admin/logs",
    items: buildPageSaveOperationItems("super-admin-logs"),
    isSaving: false,
    canSave: true,
    handle: {
      save: (selectedItemIds) =>
        runPageSaveOperations("super-admin-logs", selectedItemIds),
    },
  });

  assert.equal(getPageSaveSnapshot().isDirty, true);
  openPageSaveDialog();
  assert.equal(await executePageSave(), true);
  syncFromReact();
  assert.equal(getPageSaveSnapshot().isDirty, false, "icon hides after the save");

  stageClear();
  syncFromReact();
  assert.equal(
    getPageSaveSnapshot().isDirty,
    true,
    "re-staging the same item id must bring the header icon back",
  );
}

async function testStagedOperationsAreNeverPersisted() {
  resetPageSaveRegistryForTests();
  resetPageSavePersistenceForTests();
  resetPageSaveOperationsForTests();
  const storage = createMemoryStorage();
  configurePageSaveCore({ storage });

  stagePageSaveOperation({
    scopeId: "data-health",
    itemId: "order-purge",
    kind: "delete",
    label: "Purge orders",
    execute: async () => true,
  });

  registerPageSave({
    id: "data-health",
    label: "Data health",
    returnPath: "/super-admin/data-health",
    items: [
      { id: "notes", label: "Notes", isDirty: true, canSave: true },
      ...buildPageSaveOperationItems("data-health"),
    ],
    isSaving: false,
    canSave: true,
    handle: { save: async () => true },
  });

  await Promise.resolve();
  const stored = await storage.listPending();
  assert.equal(stored.length, 1);
  assert.deepEqual(
    stored[0]?.items.map((item) => item.id),
    ["notes"],
    "an in-memory staged operation must never reach the pending store",
  );
  assert.equal(
    getPageSaveSnapshot().isDirty,
    true,
    "the live registration still drives the header",
  );
}

async function main() {
  await testRegistryLifecycle();
  await testPrepareForSaveGate();
  await testItemSelection();
  await testDefaultSelectedTrue();
  await testMarkCleanAfterSave();
  await testHeldCleanAfterSave();
  await testSaveClearsSavingDespiteStalePageUpdate();
  await testPersistenceHydration();
  testSnapshotReferentialStability();
  testSubscribe();
  await testStagedOperationsRunThroughRegistry();
  await testRestagingTheSameOperationShowsTheIcon();
  await testStagedOperationsAreNeverPersisted();
  await testDropPageSaveItemsKeepsOtherPendingWork();
  testPackageSeal();
  console.log("page-save-core tests passed.");
}

void main();
