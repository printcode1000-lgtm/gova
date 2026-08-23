"use client";

import { useCallback, useMemo } from "react";

import { formatUserFacingApiError } from "@/core/api/user-facing-api-error";
import { translateAdminArabic } from "./admin-ar";
import type { TranslationParams } from "./types";

/**
 * Arabic-only copy for `/super-admin/*` and `/dev/*` surfaces.
 *
 * `formatApiError` is here as well as on the public hook because an admin screen still has to
 * render a failed request, and the only way to do that used to be importing the public i18n
 * barrel — which is exactly what these surfaces are forbidden to do. Without it the rule was
 * unfollowable, so a page broke it and the guard that would have said so is not in any chain.
 */
export function useAdminArabic() {
  const t = useCallback(
    (key: string, params?: TranslationParams) => translateAdminArabic(key, params),
    [],
  );

  const formatApiError = useCallback(
    (error: unknown, fallbackKey?: string) => formatUserFacingApiError(t, error, fallbackKey),
    [t],
  );

  return useMemo(
    () => ({
      t,
      formatApiError,
      locale: "ar" as const,
      isRTL: true as const,
    }),
    [t, formatApiError],
  );
}
