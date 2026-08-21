export type {
  PageSaveDialogState,
  PageSaveHandle,
  PageSaveItemInput,
  PageSaveItemState,
  PageSavePendingRecord,
  PageSavePhase,
  PageSaveRegistrationInput,
  PageSaveRuntimeConfig,
  PageSaveScopeId,
  PageSaveSnapshot,
  PageSaveStatusPatch,
  PageSaveStoragePort,
} from "./domain/page-save.types";
export { PAGE_SAVE_PENDING_SCHEMA_VERSION } from "./domain/page-save.types";
export {
  configurePageSaveCore,
  deletePageSavePendingRecord,
  loadPageSavePendingRecords,
  persistPageSavePendingRecord,
  resetPageSavePersistenceForTests,
} from "./runtime/page-save-persistence";
export {
  closePageSaveDialog,
  consumePageSaveExecuteAfterNavigation,
  executePageSave,
  getPageSaveSnapshot,
  hydratePageSavePendingFromStorage,
  markPageSaveExecuteAfterNavigation,
  openPageSaveDialog,
  registerPageSave,
  resetPageSaveRegistryForTests,
  setPageSaveItemSelected,
  subscribePageSave,
  updatePageSaveRegistration,
} from "./runtime/page-save-registry";
