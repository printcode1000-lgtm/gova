"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { resolveUiPage, uiPageAttributes } from "@asol/ui-registry-core";

/** Supplies the page identity for routes intentionally rendered without AppShell. */
export function UiPageBoundary({ children }: { children: ReactNode }) {
  const page = resolveUiPage(usePathname());
  return <div {...uiPageAttributes(page)}>{children}</div>;
}
