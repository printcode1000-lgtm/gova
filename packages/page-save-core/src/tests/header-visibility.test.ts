import assert from "node:assert/strict";

import {
  acknowledgePageSaveResult,
  buildPageSaveOperationItems,
  clearPageSaveOperations,
  closePageSaveDialog,
  configurePageSaveCore,
  dropPageSaveItems,
  executePageSave,
  getPageSaveSnapshot,
  hydratePageSavePendingFromStorage,
  openPageSaveDialog,
  registerPageSave,
  resetPageSaveOperationsForTests,
  resetPageSavePersistenceForTests,
  resetPageSaveRegistryForTests,
  runPageSaveOperations,
  setPageSaveItemSelected,
  stagePageSaveOperation,
  updatePageSaveRegistration,
  type PageSaveItemInput,
  type PageSaveJournalEntry,
  type PageSavePendingRecord,
} from "../index";

/**
 * The header icon is the only save affordance in the product, so every state it
 * can reach is pinned here rather than left to manual checking.
 */

function createMemoryStorage(seed: PageSavePendingRecord[] = []) {
  const store = new Map(seed.map((record) => [record.id, record]));
  const journal = new Map<string, PageSaveJournalEntry>();
  return {
    store,
    journal,
    getPending: async (id: string) => store.get(id),
    setPending: async (record: PageSavePendingRecord) => {
      store.set(record.id, record);
    },
    deletePending: async (id: string) => {
      store.delete(id);
    },
    listPending: async () => [...store.values()],
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

/** What `PageSaveHeaderButton` renders from, expressed as one value. */
function headerState(): "hidden" | "dirty" | "saving" {
  const snapshot = getPageSaveSnapshot();
  if (snapshot.isSaving || snapshot.phase === "saving") return "saving";
  if (snapshot.isDirty || snapshot.hasPersistedPending) return "dirty";
  return "hidden";
}

function formScope(
  id: string,
  items: PageSaveItemInput[],
  save: (selectedItemIds: string[]) => Promise<boolean>,
) {
  return registerPageSave({
    id,
    label: id,
    returnPath: `/${id}`,
    items,
    isSaving: false,
    canSave: true,
    handle: { save },
  });
}

function syncItems(id: string, items: PageSaveItemInput[]): void {
  updatePageSaveRegistration(id, {
    label: id,
    returnPath: `/${id}`,
    items,
    isSaving: false,
    canSave: true,
  });
}

const dirtyItem: PageSaveItemInput = {
  id: "details",
  label: "Details",
  isDirty: true,
  canSave: true,
};
const cleanItem: PageSaveItemInput = { ...dirtyItem, isDirty: false };

async function testIconAppearsOnEditAndHidesAfterSave() {
  reset();
  formScope("product-edit", [dirtyItem], async () => true);
  assert.equal(headerState(), "dirty");

  openPageSaveDialog();
  assert.equal(getPageSaveSnapshot().dialogOpen, true);
  assert.equal(await executePageSave(), true);
  assert.equal(getPageSaveSnapshot().dialogOpen, false, "dialog closes on success");
  assert.equal(getPageSaveSnapshot().lastResult, "success");
  assert.equal(headerState(), "hidden", "icon hides immediately after a save");
}

async function testSuccessIsAcknowledgedOnlyOnce() {
  reset();
  formScope("product-edit", [dirtyItem], async () => true);
  openPageSaveDialog();
  assert.equal(await executePageSave(), true);

  assert.equal(
    acknowledgePageSaveResult(),
    "success",
    "the header consumes the result to flash one check mark",
  );
  assert.equal(getPageSaveSnapshot().lastResult, null);
  assert.equal(
    acknowledgePageSaveResult(),
    null,
    "a consumed result cannot flash again on the next page",
  );
}

async function testIconHidesWhenTheUserUndoesTheEdit() {
  reset();
  formScope("product-edit", [dirtyItem], async () => true);
  assert.equal(headerState(), "dirty");

  syncItems("product-edit", [cleanItem]);
  assert.equal(headerState(), "hidden", "reverting an edit hides the icon");
}

async function testIconStaysAfterAFailedSave() {
  reset();
  formScope("product-edit", [dirtyItem], async () => false);
  openPageSaveDialog();

  assert.equal(await executePageSave(), false);
  const snapshot = getPageSaveSnapshot();
  assert.equal(snapshot.lastResult, "failure");
  assert.equal(snapshot.dialogOpen, true, "the dialog stays open to report failure");
  assert.equal(snapshot.isSaving, false, "the spinner clears");
  assert.equal(headerState(), "dirty", "unsaved work keeps the icon visible");
  closePageSaveDialog();
}

async function testIconStaysWhenOnlyPartOfThePageIsSaved() {
  reset();
  const saved: string[][] = [];
  formScope(
    "profile-edit",
    [
      { id: "registration", label: "Registration", isDirty: true, canSave: true },
      { id: "store", label: "Store", isDirty: true, canSave: true },
    ],
    async (selectedItemIds) => {
      saved.push(selectedItemIds);
      return true;
    },
  );

  openPageSaveDialog();
  setPageSaveItemSelected("profile-edit", "store", false);
  assert.equal(await executePageSave(), true);

  assert.deepEqual(saved, [["registration"]], "only the checked item is saved");
  assert.equal(headerState(), "dirty", "the unchecked item keeps the icon visible");
  closePageSaveDialog();
}

async function testAllItemsUnselectedBlocksSaving() {
  reset();
  formScope("profile-edit", [dirtyItem], async () => true);
  openPageSaveDialog();
  setPageSaveItemSelected("profile-edit", "details", false);

  assert.equal(getPageSaveSnapshot().canSave, false, "nothing selected blocks save");
  assert.equal(await executePageSave(), false);
  assert.equal(headerState(), "dirty", "the icon still points at unsaved work");
  closePageSaveDialog();
}

async function testOnlyTheDirtyScopeDrivesTheHeader() {
  reset();
  formScope("product-edit", [dirtyItem], async () => true);
  // A second, clean scope mounts afterwards (reviews on the same product page).
  formScope("product-reviews", [], async () => true);

  const snapshot = getPageSaveSnapshot();
  assert.equal(snapshot.registrationId, "product-edit");
  assert.equal(snapshot.label, "product-edit");
  assert.equal(headerState(), "dirty");

  openPageSaveDialog();
  assert.deepEqual(
    getPageSaveSnapshot().dialog?.items.map((item) => item.id),
    ["details"],
    "the dialog shows the scope that actually has work",
  );
  closePageSaveDialog();
}

async function testSavingAStagedOperationLeavesFormWorkVisible() {
  reset();
  stagePageSaveOperation({
    scopeId: "profile-edit",
    itemId: "product-delete:1",
    kind: "delete",
    label: "Delete product",
    execute: async () => true,
  });

  const items = () => [dirtyItem, ...buildPageSaveOperationItems("profile-edit")];
  formScope("profile-edit", items(), async (selectedItemIds) => {
    await runPageSaveOperations("profile-edit", selectedItemIds);
    return true;
  });

  openPageSaveDialog();
  setPageSaveItemSelected("profile-edit", "details", false);
  assert.equal(await executePageSave(), true);
  syncItems("profile-edit", items());

  assert.deepEqual(buildPageSaveOperationItems("profile-edit"), []);
  assert.equal(headerState(), "dirty", "the untouched form section stays pending");
  closePageSaveDialog();
}

async function testUnmountingAStagingSurfaceHidesTheIcon() {
  reset();
  configurePageSaveCore({ storage: createMemoryStorage() });
  stagePageSaveOperation({
    scopeId: "data-health",
    itemId: "purge",
    kind: "delete",
    label: "Purge",
    execute: async () => true,
  });
  const unregister = formScope(
    "data-health",
    buildPageSaveOperationItems("data-health"),
    async (ids) => runPageSaveOperations("data-health", ids),
  );
  assert.equal(headerState(), "dirty");

  // What the React cleanup does, in the same order.
  dropPageSaveItems("data-health", clearPageSaveOperations("data-health"));
  unregister();

  assert.equal(headerState(), "hidden", "leaving the page drops unrunnable work");
}

async function testHydratedPendingRecordKeepsTheIconAndAsksForNavigation() {
  reset();
  const storage = createMemoryStorage([
    {
      schemaVersion: 1,
      id: "profile-edit",
      pageLabel: "Profile",
      returnPath: "/profile?mode=edit",
      items: [
        {
          id: "registration",
          label: "Registration",
          operation: "save",
          isDirty: true,
          canSave: true,
          selected: true,
        },
      ],
      updatedAt: new Date().toISOString(),
    },
  ]);
  configurePageSaveCore({ storage });
  await hydratePageSavePendingFromStorage();

  assert.equal(headerState(), "dirty", "a restart keeps the pending icon");
  openPageSaveDialog();
  const dialog = getPageSaveSnapshot().dialog;
  assert.equal(dialog?.requiresNavigation, true);
  assert.equal(dialog?.returnPath, "/profile?mode=edit");
  closePageSaveDialog();
}

async function main() {
  await testIconAppearsOnEditAndHidesAfterSave();
  await testSuccessIsAcknowledgedOnlyOnce();
  await testIconHidesWhenTheUserUndoesTheEdit();
  await testIconStaysAfterAFailedSave();
  await testIconStaysWhenOnlyPartOfThePageIsSaved();
  await testAllItemsUnselectedBlocksSaving();
  await testOnlyTheDirtyScopeDrivesTheHeader();
  await testSavingAStagedOperationLeavesFormWorkVisible();
  await testUnmountingAStagingSurfaceHidesTheIcon();
  await testHydratedPendingRecordKeepsTheIconAndAsksForNavigation();
  console.log("page-save header visibility tests passed.");
}

void main();
