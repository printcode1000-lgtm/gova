"use client";

import { useEffect } from "react";

import {
  hydratePageSavePendingFromStorage,
  registerPageSaveCorePorts,
} from "@/features/page-save/page-save-core-bootstrap";

export function PageSaveRuntimeInit() {
  useEffect(() => {
    registerPageSaveCorePorts();
    void hydratePageSavePendingFromStorage();
  }, []);

  return null;
}
