"use client";

import { formatAdminDateTime } from "@asol/format-core";

export function formatDate(value?: string, locale: "ar" | "en" = "ar") {
  return formatAdminDateTime(value, { locale });
}

export { formatBytes } from "@asol/format-core";

export function diffText(before: unknown, after: unknown) {
  return JSON.stringify({ current: before, pending: after }, null, 2);
}
