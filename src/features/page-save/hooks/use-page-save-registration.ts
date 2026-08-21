"use client";

import * as React from "react";

import {
  consumePageSaveExecuteAfterNavigation,
  openPageSaveDialog,
  registerPageSave,
  updatePageSaveRegistration,
  type PageSaveHandle,
  type PageSaveItemInput,
} from "@asol/page-save-core";

export interface UsePageSaveRegistrationInput {
  id: string;
  label: string;
  returnPath: string;
  enabled?: boolean;
  items: PageSaveItemInput[];
  isSaving: boolean;
  canSave: boolean;
  save: (selectedItemIds: string[]) => Promise<boolean | void>;
  prepareForSave?: (selectedItemIds: string[]) => Promise<boolean>;
}

export function usePageSaveRegistration({
  id,
  label,
  returnPath,
  enabled = true,
  items,
  isSaving,
  canSave,
  save,
  prepareForSave,
}: UsePageSaveRegistrationInput): void {
  const handleRef = React.useRef<PageSaveHandle>({
    save: async () => true,
  });

  handleRef.current = {
    save: async (selectedItemIds) => {
      const result = await save(selectedItemIds);
      return result !== false;
    },
    prepareForSave,
  };

  React.useEffect(() => {
    if (!enabled) return undefined;

    return registerPageSave({
      id,
      label,
      returnPath,
      items,
      isSaving,
      canSave,
      handle: {
        save: (selectedItemIds) => handleRef.current.save(selectedItemIds),
        prepareForSave: (selectedItemIds) =>
          handleRef.current.prepareForSave?.(selectedItemIds) ??
          Promise.resolve(true),
      },
    });
  }, [enabled, id]);

  React.useEffect(() => {
    if (!enabled) return;
    updatePageSaveRegistration(id, {
      label,
      returnPath,
      items,
      isSaving,
      canSave,
    });
  }, [enabled, id, label, returnPath, items, isSaving, canSave]);

  React.useEffect(() => {
    if (!enabled) return;
    if (!consumePageSaveExecuteAfterNavigation(id)) return;
    openPageSaveDialog();
  }, [enabled, id]);
}
