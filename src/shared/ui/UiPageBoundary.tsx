"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import {
  resolveUiPage,
  uiAttributes,
  uiPageContextAttributes,
} from "@asol/ui-registry-core";

/** Supplies page context for routes intentionally rendered without AppShell. */
export function UiPageBoundary({ children, id }: { children: ReactNode; id?: string }) {
  const page = resolveUiPage(usePathname());
  return (
    <div
      {...uiAttributes({ uid: "shared.ui-page-boundary.div-ivFS6M", id: "shared.ui-page-boundary.div" })}
      id={id}
      {...uiPageContextAttributes(page)}
    >
      {children}
    </div>
  );
}
