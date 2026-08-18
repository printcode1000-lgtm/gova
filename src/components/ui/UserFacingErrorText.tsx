"use client";

import { formatUserFacingApiError } from "@/core/api/user-facing-api-error";
import { useTranslation } from "@/lib/i18n";

export function UserFacingErrorText({
  error,
  className,
  fallbackKey,
}: {
  error: string | Error | null | undefined;
  className?: string;
  fallbackKey?: string;
}) {
  const { t } = useTranslation();
  if (!error) return null;
  return (
    <p className={className}>
      {formatUserFacingApiError(t, error, fallbackKey)}
    </p>
  );
}
