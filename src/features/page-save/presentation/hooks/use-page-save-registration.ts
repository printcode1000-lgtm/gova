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
  const registrationTokenRef = React.useRef<number | null>(null);
  const statusRevisionRef = React.useRef(0);
  statusRevisionRef.current += 1;
  const statusRevision = statusRevisionRef.current;

  handleRef.current = {
    save: async (selectedItemIds) => {
      const result = await save(selectedItemIds);
      return result !== false;
    },
    prepareForSave,
  };

  React.useEffect(() => {
    if (!enabled) return undefined;

    const cleanup = registerPageSave({
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
    registrationTokenRef.current = cleanup.registrationToken;
    return () => {
      if (registrationTokenRef.current === cleanup.registrationToken) {
        registrationTokenRef.current = null;
      }
      cleanup();
    };
  }, [enabled, id]);

  React.useEffect(() => {
    if (!enabled) return;
    updatePageSaveRegistration(
      id,
      {
        label,
        returnPath,
        items,
        isSaving,
        canSave,
      },
      registrationTokenRef.current ?? undefined,
      statusRevision,
    );
  }, [
    enabled,
    id,
    label,
    returnPath,
    items,
    isSaving,
    canSave,
    statusRevision,
  ]);

  React.useEffect(() => {
    if (!enabled) return;
    if (!consumePageSaveExecuteAfterNavigation(id)) return;
    openPageSaveDialog();
  }, [enabled, id]);
}
