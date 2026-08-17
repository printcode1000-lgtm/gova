"use client";

import { useCallback, useMemo } from "react";

import { translateAdminArabic } from "./admin-ar";
import type { TranslationParams } from "./types";

/** Arabic-only copy for `/super-admin/*` and `/dev/*` surfaces. */
export function useAdminArabic() {
  const t = useCallback(
    (key: string, params?: TranslationParams) => translateAdminArabic(key, params),
    [],
  );

  return useMemo(
    () => ({
      t,
      locale: "ar" as const,
      isRTL: true as const,
    }),
    [t],
  );
}
