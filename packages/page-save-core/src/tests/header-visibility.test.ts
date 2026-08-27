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

async function testDialogClosesBeforeTheSaveFinishes() {
  reset();
  let release: (() => void) | null = null;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  formScope("product-edit", [dirtyItem], async () => {
    await pending;
    return true;
  });
  openPageSaveDialog();

  const execution = executePageSave();
  await Promise.resolve();
  assert.equal(
    getPageSaveSnapshot().dialogOpen,
    false,
    "the dialog disappears the moment execute is tapped",
  );
  assert.equal(getPageSaveSnapshot().isSaving, true, "the save keeps running");

  release!();
  assert.equal(await execution, true);
  assert.equal(getPageSaveSnapshot().dialogOpen, false);
  assert.equal(getPageSaveSnapshot().lastResult, "success");
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

async function testExecuteDiscardsUncheckedStagedWork() {
  reset();
  const executed: string[] = [];
  for (const itemId of ["delete:first", "delete:second"]) {
    stagePageSaveOperation({
      scopeId: "super-admin-users",
      itemId,
      kind: "delete",
      label: itemId,
      execute: async () => {
        executed.push(itemId);
        return true;
      },
    });
  }
  formScope(
    "super-admin-users",
    buildPageSaveOperationItems("super-admin-users"),
    async (selectedItemIds) =>
      runPageSaveOperations("super-admin-users", selectedItemIds),
  );

  openPageSaveDialog();
  setPageSaveItemSelected("super-admin-users", "delete:second", false);
  assert.equal(await executePageSave(), true);

  assert.deepEqual(executed, ["delete:first"], "only checked work executes");
  assert.deepEqual(
    buildPageSaveOperationItems("super-admin-users"),
    [],
    "unchecked staged work is discarded rather than left for later",
  );
  assert.equal(headerState(), "hidden", "nothing remains after execute");
}

async function testExecuteCanDiscardAllStagedWork() {
  reset();
  let executed = false;
  stagePageSaveOperation({
    scopeId: "data-health",
    itemId: "purge",
    kind: "delete",
    label: "Purge",
    execute: async () => {
      executed = true;
      return true;
    },
  });
  formScope(
    "data-health",
    buildPageSaveOperationItems("data-health"),
    async (selectedItemIds) =>
      runPageSaveOperations("data-health", selectedItemIds),
  );
  openPageSaveDialog();
  setPageSaveItemSelected("data-health", "purge", false);

  assert.equal(getPageSaveSnapshot().canSave, true, "Execute can discard all staged work");
  assert.equal(await executePageSave(), true);
  assert.equal(executed, false, "discarded work never runs");
  assert.equal(headerState(), "hidden");
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

async function testFormWorkCannotBeUnchecked() {
  reset();
  const saved: string[][] = [];
  formScope("profile-edit", [dirtyItem], async (selectedItemIds) => {
    saved.push(selectedItemIds);
    return true;
  });

  openPageSaveDialog();
  setPageSaveItemSelected("profile-edit", "details", false);
  assert.equal(
    getPageSaveSnapshot().dialog?.items[0]?.selected,
    true,
    "form-derived work remains locked on",
  );
  assert.equal(await executePageSave(), true);
  assert.deepEqual(saved, [["details"]]);
  assert.equal(headerState(), "hidden");
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
          selected: false,
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
  assert.equal(
    dialog?.items[0]?.selected,
    true,
    "restart normalizes old form records to always included",
  );
  closePageSaveDialog();
}

async function testStalePendingRecordNeitherShowsTheIconNorOpensADialog() {
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
          isDirty: false,
          canSave: true,
          selected: true,
        },
      ],
      updatedAt: new Date().toISOString(),
    },
  ]);
  configurePageSaveCore({ storage });
  await hydratePageSavePendingFromStorage();

  assert.equal(headerState(), "hidden", "a record with no dirty work is not pending");
  assert.equal(storage.store.size, 0, "the stale record is deleted from storage");

  // A page that only stages operations mounts with an empty scope; the header
  // must stay hidden and the dialog must refuse to open with nothing listed.
  formScope("super-admin-logs", [], async () => true);
  assert.equal(headerState(), "hidden");
  openPageSaveDialog();
  assert.equal(
    getPageSaveSnapshot().dialogOpen,
    false,
    "no dialog opens when there is nothing to execute",
  );
}

async function main() {
  await testIconAppearsOnEditAndHidesAfterSave();
  await testSuccessIsAcknowledgedOnlyOnce();
  await testIconHidesWhenTheUserUndoesTheEdit();
  await testDialogClosesBeforeTheSaveFinishes();
  await testIconStaysAfterAFailedSave();
  await testExecuteDiscardsUncheckedStagedWork();
  await testExecuteCanDiscardAllStagedWork();
  await testOnlyTheDirtyScopeDrivesTheHeader();
  await testFormWorkCannotBeUnchecked();
  await testUnmountingAStagingSurfaceHidesTheIcon();
  await testHydratedPendingRecordKeepsTheIconAndAsksForNavigation();
  await testStalePendingRecordNeitherShowsTheIconNorOpensADialog();
  console.log("page-save header visibility tests passed.");
}

void main();
