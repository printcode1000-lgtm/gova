import * as React from "react";

import { cn } from "@/shared/utils";
import { uiAttributes } from "@asol/ui-registry-core";

export function StatusBox({ id,
  kind,
  children,
}: {
  kind: "error" | "success" | "notice";
  children: React.ReactNode;
} & { id?: string }) {
  return (
    <div {...uiAttributes({ uid: "catalog-studio.status-box.div-X3u80l", id: "catalog-studio.status-box.div" })} id={id}
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        kind === "error" &&
          "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200",
        kind === "success" &&
          "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200",
        kind === "notice" &&
          "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
      )}
    >
      {children}
    </div>
  );
}
