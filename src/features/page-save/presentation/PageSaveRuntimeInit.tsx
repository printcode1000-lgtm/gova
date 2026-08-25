"use client";

import { useEffect } from "react";

import {
  hydratePageSavePendingFromStorage,
  hydratePageSaveRecoveryFromStorage,
} from "@/features/page-save/application/page-save-core-bootstrap";

/**
 * Ports are registered by the browser composition root. This only restores what
 * the previous session left behind, once the app is running.
 */
export function PageSaveRuntimeInit() {
  useEffect(() => {
    void hydratePageSavePendingFromStorage();
    void hydratePageSaveRecoveryFromStorage();
  }, []);

  return null;
}
