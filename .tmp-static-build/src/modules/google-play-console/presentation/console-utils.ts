"use client";

export function formatDate(value?: string, locale = "ar-EG") {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}

export function formatBytes(value = 0) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function diffText(before: unknown, after: unknown) {
  return JSON.stringify({ current: before, pending: after }, null, 2);
}
