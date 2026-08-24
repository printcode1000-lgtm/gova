"use client";

import * as React from "react";

import { usePageSaveRegistration } from "./use-page-save-registration";
import {
  usePageSaveOperations,
  type PageSaveOperations,
} from "./use-page-save-operations";

export interface UsePageSaveOperationScopeInput {
  id: string;
  label: string;
  returnPath: string;
  enabled?: boolean;
}

/**
 * Registers a page-save scope whose only work is staged save / upload / delete
 * operations, for pages that would otherwise need their own action buttons.
 */
export function usePageSaveOperationScope({
  id,
  label,
  returnPath,
  enabled = true,
}: UsePageSaveOperationScopeInput): PageSaveOperations {
  const operations = usePageSaveOperations(id);
  const [isRunning, setIsRunning] = React.useState(false);

  // Losing the scope (sign-out, leaving edit mode) invalidates every staged
  // closure, so drop them instead of letting them resurface with stale state.
  const clearOperations = operations.clear;
  React.useEffect(() => {
    if (enabled) return;
    clearOperations();
  }, [clearOperations, enabled]);

  usePageSaveRegistration({
    id,
    label,
    returnPath,
    enabled,
    items: operations.items,
    isSaving: isRunning,
    canSave: operations.items.length > 0,
    save: async (selectedItemIds) => {
      setIsRunning(true);
      try {
        return await operations.run(selectedItemIds);
      } finally {
        setIsRunning(false);
      }
    },
  });

  return operations;
}
