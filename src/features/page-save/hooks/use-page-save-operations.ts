"use client";

import * as React from "react";
import {
  buildPageSaveOperationItems,
  clearPageSaveOperations,
  dropPageSaveItems,
  hasPageSaveOperation,
  runPageSaveOperations,
  stagePageSaveOperation,
  subscribePageSaveOperations,
  unstagePageSaveOperation,
  type PageSaveItemInput,
  type PageSaveOperationKind,
} from "@asol/page-save-core";

export interface StagePageSaveOperationInput {
  itemId: string;
  kind: PageSaveOperationKind;
  label: string;
  description?: string;
  canSave?: boolean;
  execute: () => Promise<boolean | void>;
}

const EMPTY_ITEMS: PageSaveItemInput[] = [];

export interface PageSaveOperations {
  items: PageSaveItemInput[];
  hasPending: boolean;
  isStaged: (itemId: string) => boolean;
  stage: (operation: StagePageSaveOperationInput) => void;
  unstage: (itemId: string) => void;
  clear: () => void;
  run: (selectedItemIds: string[]) => Promise<boolean>;
}

/**
 * Stages user-triggered save / upload / delete work for one page-save scope so
 * the registry, not the page, decides when it runs.
 */
export function usePageSaveOperations(scopeId: string): PageSaveOperations {
  const items = React.useSyncExternalStore(
    subscribePageSaveOperations,
    () => buildPageSaveOperationItems(scopeId),
    () => EMPTY_ITEMS,
  );

  React.useEffect(
    () => () => {
      dropPageSaveItems(scopeId, clearPageSaveOperations(scopeId));
    },
    [scopeId],
  );

  const stage = React.useCallback(
    (operation: StagePageSaveOperationInput) => {
      stagePageSaveOperation({ scopeId, ...operation });
    },
    [scopeId],
  );

  const unstage = React.useCallback(
    (itemId: string) => unstagePageSaveOperation(scopeId, itemId),
    [scopeId],
  );

  const clear = React.useCallback(() => {
    dropPageSaveItems(scopeId, clearPageSaveOperations(scopeId));
  }, [scopeId]);

  const run = React.useCallback(
    (selectedItemIds: string[]) => runPageSaveOperations(scopeId, selectedItemIds),
    [scopeId],
  );

  const isStaged = React.useCallback(
    (itemId: string) => hasPageSaveOperation(scopeId, itemId),
    [scopeId],
  );

  return {
    items,
    hasPending: items.length > 0,
    isStaged,
    stage,
    unstage,
    clear,
    run,
  };
}
