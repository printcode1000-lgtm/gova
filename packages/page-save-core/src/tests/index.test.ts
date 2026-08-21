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
} from "../index";

function createMemoryStorage() {
  const store = new Map<string, import("../domain/page-save.types").PageSavePendingRecord>();
  return {
    getPending: async (id: string) => store.get(id),
    setPending: async (record: import("../domain/page-save.types").PageSavePendingRecord) => {
      store.set(record.id, record);
    },
    deletePending: async (id: string) => {
      store.delete(id);
    },
    listPending: async () => [...store.values()],
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

async function main() {
  await testRegistryLifecycle();
  await testPrepareForSaveGate();
  await testItemSelection();
  await testDefaultSelectedTrue();
  await testMarkCleanAfterSave();
  await testPersistenceHydration();
  testSnapshotReferentialStability();
  testSubscribe();
  testPackageSeal();
  console.log("page-save-core tests passed.");
}

void main();
