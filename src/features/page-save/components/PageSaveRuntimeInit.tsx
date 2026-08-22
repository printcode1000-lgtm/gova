"use client";

import { useEffect } from "react";

import { registerBrowserPorts } from "@/core/composition/browser-ports";
import {
  hydratePageSavePendingFromStorage,
  hydratePageSaveRecoveryFromStorage,
} from "@/features/page-save/page-save-core-bootstrap";

// Module scope, as every other consumer of the composition root does: the
// storage port must exist before the first hydration read, not after an effect.
registerBrowserPorts();

/**
 * Ports are registered by the browser composition root; this only restores what
 * the previous session left behind, once the app is running.
 */
export function PageSaveRuntimeInit() {
  useEffect(() => {
    void hydratePageSavePendingFromStorage();
    void hydratePageSaveRecoveryFromStorage();
  }, []);

  return null;
}
