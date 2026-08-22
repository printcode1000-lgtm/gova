export type PageSaveOperationKind = "save" | "upload" | "delete";

/**
 * A user-triggered save / upload / delete that a page has staged instead of
 * running immediately. The registry executes it when the user confirms the
 * page-save dialog, so no page may own a save, upload, or delete button.
 */
export interface PageSaveStagedOperation {
  scopeId: string;
  itemId: string;
  kind: PageSaveOperationKind;
  label: string;
  description?: string;
  canSave?: boolean;
  execute: () => Promise<boolean | void>;
}
