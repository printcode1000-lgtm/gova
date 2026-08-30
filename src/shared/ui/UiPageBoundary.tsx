"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";


/** Supplies page context for routes intentionally rendered without AppShell. */
export function UiPageBoundary({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <div
      id={id}
    >
      {children}
    </div>
  );
}
