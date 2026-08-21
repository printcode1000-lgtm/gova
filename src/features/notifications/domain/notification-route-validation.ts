import type { NotificationRoute } from "@asol/notifications-core";

import {
  NotificationError,
  NotificationErrorCodes,
  invalidField,
} from "./notification-error";
import {
  assertOptionalString,
  hasControlCharacters,
} from "./notification-validation-primitives";
import { NOTIFICATION_LIMITS } from "./notification-validation-constants";

export function isSafeInternalRoute(href: unknown): href is string {
  if (typeof href !== "string") return false;
  const value = href.trim();
  if (!value || value.length > NOTIFICATION_LIMITS.routeHref) return false;
  if (hasControlCharacters(value)) return false;
  if (!value.startsWith("/")) return false;
  if (/^\/[\\/]/.test(value)) return false;
  if (value.includes("\\")) return false;
  if (/%2f%2f/i.test(value)) return false;
  if (/\.\.(?:\/|$)/.test(value)) return false;
  return true;
}

export function assertRoute(value: unknown, field = "route"): NotificationRoute | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object") throw invalidField(field, "must be an object");
  const candidate = value as { href?: unknown; label?: unknown };
  if (!isSafeInternalRoute(candidate.href)) {
    throw new NotificationError(
      NotificationErrorCodes.UnsafeRoute,
      `${field}.href must be a safe internal path beginning with "/".`,
      { field: `${field}.href` },
    );
  }
  const label = assertOptionalString(
    candidate.label,
    `${field}.label`,
    NOTIFICATION_LIMITS.routeLabel,
  );
  return { href: candidate.href.trim(), ...(label ? { label } : {}) };
}

export function sanitizeRoute(value: unknown): NotificationRoute | undefined {
  try {
    return assertRoute(value);
  } catch {
    return undefined;
  }
}
