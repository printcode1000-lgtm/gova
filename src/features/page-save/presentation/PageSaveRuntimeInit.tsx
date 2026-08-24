"use client";

import { useEffect } from "react";

import { registerBrowserPorts } from "@/core/composition/browser-ports";
import {
  hydratePageSavePendingFromStorage,
  hydratePageSaveRecoveryFromStorage,
} from "@/features/page-save/application/page-save-core-bootstrap";

/**
 * Ports are registered by the browser composition root; this only restores what
 * the previous session left behind, once the app is running.
 *
 * Registration runs on first render (not at module evaluation) so importing this
 * module through `@/features/page-save/ui` cannot TDZ-cycle `browser-ports`
 * while auth/ui barrels are still loading.
 */
export function PageSaveRuntimeInit() {
  registerBrowserPorts();

  useEffect(() => {
    void hydratePageSavePendingFromStorage();
    void hydratePageSaveRecoveryFromStorage();
  }, []);

  return null;
}
