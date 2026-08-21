/**
 * What the module refuses to believe.
 *
 * Every value that crosses into the module — a command from a caller, a payload
 * from FCM, a record read back from IndexedDB, a tray notification from the OS,
 * an entry replayed from the retry queue — is checked here before it can reach
 * persistence, navigation, a native plugin, a provider, a log, or the screen.
 *
 * Two strictnesses, and the difference matters:
 *
 * - `assert*` **throws** a `NotificationError`. Used for values a caller in this
 *   codebase supplied: a bug should be loud and fixed at the call site.
 * - `sanitize*` **drops** what it cannot trust and keeps the rest. Used for
 *   anything that arrived from outside the process — a provider, a plugin, a
 *   service worker, a record written by an older version. Throwing there would
 *   turn one malformed key into a lost notification.
 */

import type {
  NotificationEntity,
} from "@asol/notifications-core";
import {
  NotificationCategories,
  NotificationChannels,
  NotificationContentSources,
  NotificationDeliveryStatuses,
  NotificationPlatforms,
  NotificationPriorities,
  NotificationSounds,
  NotificationSyncStates,
  NotificationTargets,
  NotificationTypes,
  type NotificationCategory,
  type NotificationChannel,
  type NotificationPlatform,
  type NotificationPriority,
  type NotificationSound,
  type NotificationTarget,
} from "@asol/notifications-core";
import {
  invalidField,
} from "./notification-error";
import {
  NOTIFICATION_LIMITS,
} from "./notification-validation-constants";
import {
  assertDedupeKey,
  assertEnumArray,
  assertNotificationId,
  assertOptionalString,
  assertTimestamp,
  assertUid,
  enumAssert,
  stripControlCharacters,
} from "./notification-validation-primitives";
import { assertRoute, sanitizeRoute } from "./notification-route-validation";
import { assertMetadata, sanitizeMetadata } from "./notification-metadata-validation";

export { NOTIFICATION_LIMITS } from "./notification-validation-constants";
export {
  assertDedupeKey,
  assertDeviceToken,
  assertLocale,
  assertNotificationId,
  assertOptionalLocale,
  assertOptionalString,
  assertPhone,
  assertString,
  assertTimestamp,
  assertUid,
} from "./notification-validation-primitives";
export {
  assertRoute,
  isSafeInternalRoute,
  sanitizeRoute,
} from "./notification-route-validation";
export {
  assertMetadata,
  sanitizeMetadata,
  type NotificationMetadata,
} from "./notification-metadata-validation";
export {
  RETRY_OPERATION_KINDS,
  assertRetryKind,
  sanitizeRetryOperation,
  type RetryOperationKind,
} from "./notification-retry-validation";
export { assertExtensionRegistration } from "./notification-extension-validation";

export const assertCategory = enumAssert(
  Object.values(NotificationCategories) as NotificationCategory[],
  "category",
);
export const assertPriority = enumAssert(
  Object.values(NotificationPriorities) as NotificationPriority[],
  "priority",
);
export const assertSound = enumAssert(
  Object.values(NotificationSounds) as NotificationSound[],
  "sound",
);
export const assertPlatform = enumAssert(
  Object.values(NotificationPlatforms) as NotificationPlatform[],
  "platform",
);

export function assertChannels(value: unknown, field = "channels"): NotificationChannel[] {
  return assertEnumArray(
    value,
    field,
    Object.values(NotificationChannels) as NotificationChannel[],
    NOTIFICATION_LIMITS.channels,
  );
}

export function assertTargets(value: unknown, field = "targets"): NotificationTarget[] {
  return assertEnumArray(
    value,
    field,
    Object.values(NotificationTargets) as NotificationTarget[],
    NOTIFICATION_LIMITS.targets,
  );
}

// ---------------------------------------------------------------------------
// Whole notifications
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Whole notifications
// ---------------------------------------------------------------------------

/**
 * A notification a caller in this codebase built. Throws on anything wrong, and
 * returns a normalized copy — trimmed text, deduplicated channels and targets,
 * canonical timestamps — so what reaches storage is exactly what was checked.
 */
export function assertNotificationEntity(
  value: unknown,
  field = "notification",
): NotificationEntity {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw invalidField(field, "must be an object");
  }
  const input = value as Record<string, unknown>;
  const now = new Date().toISOString();

  const type = enumAssert(Object.values(NotificationTypes), `${field}.type`)(input.type);
  const source = enumAssert(
    Object.values(NotificationContentSources),
    `${field}.source`,
  )(input.source);
  const status = enumAssert(
    Object.values(NotificationDeliveryStatuses),
    `${field}.status`,
  )(input.status);
  const syncState = enumAssert(
    Object.values(NotificationSyncStates),
    `${field}.syncState`,
  )(input.syncState);

  const entity: NotificationEntity = {
    id: assertNotificationId(input.id, `${field}.id`),
    uid: assertUid(input.uid, `${field}.uid`),
    type,
    source,
    templateId: assertOptionalString(input.templateId, `${field}.templateId`, 128),
    eventName: assertOptionalString(input.eventName, `${field}.eventName`, 128),
    // Title and body may legitimately be empty on a data-only delivery, so the
    // minimum is zero here and emptiness is judged by the visibility rule.
    title: assertOptionalString(input.title, `${field}.title`, NOTIFICATION_LIMITS.title) ?? "",
    body: assertOptionalString(input.body, `${field}.body`, NOTIFICATION_LIMITS.body) ?? "",
    category: assertCategory(input.category),
    priority: assertPriority(input.priority),
    channels: assertChannels(input.channels, `${field}.channels`),
    targets: assertTargets(input.targets, `${field}.targets`),
    route: assertRoute(input.route, `${field}.route`),
    groupKey: assertOptionalString(input.groupKey, `${field}.groupKey`, NOTIFICATION_LIMITS.groupKey),
    dedupeKey: assertDedupeKey(input.dedupeKey, `${field}.dedupeKey`),
    sound: assertSound(input.sound),
    status,
    syncState,
    readAt: input.readAt === undefined ? undefined : assertTimestamp(input.readAt, `${field}.readAt`),
    displayedAt:
      input.displayedAt === undefined
        ? undefined
        : assertTimestamp(input.displayedAt, `${field}.displayedAt`),
    openedAt:
      input.openedAt === undefined ? undefined : assertTimestamp(input.openedAt, `${field}.openedAt`),
    dismissedAt:
      input.dismissedAt === undefined
        ? undefined
        : assertTimestamp(input.dismissedAt, `${field}.dismissedAt`),
    createdAt: input.createdAt === undefined ? now : assertTimestamp(input.createdAt, `${field}.createdAt`),
    updatedAt: input.updatedAt === undefined ? now : assertTimestamp(input.updatedAt, `${field}.updatedAt`),
    metadata: assertMetadata(input.metadata, `${field}.metadata`),
  };
  return entity;
}

/**
 * A notification that came from outside: a provider payload already mapped by an
 * adapter, a record read back from storage, a service-worker copy.
 *
 * Returns `null` rather than throwing when the record cannot be repaired into
 * something safe. A record missing a `uid`, an `id`, or a `dedupeKey` has no
 * identity and cannot be stored or deduplicated, so there is nothing to keep.
 */
export function sanitizeNotificationEntity(value: unknown): NotificationEntity | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;

  const id = typeof input.id === "string" ? input.id.trim().slice(0, NOTIFICATION_LIMITS.notificationId) : "";
  const uid = typeof input.uid === "string" ? input.uid.trim().slice(0, NOTIFICATION_LIMITS.uid) : "";
  if (!id || !uid) return null;

  const dedupeKey =
    typeof input.dedupeKey === "string" && input.dedupeKey.trim()
      ? input.dedupeKey.trim().slice(0, NOTIFICATION_LIMITS.dedupeKey)
      : id;

  const oneOf = <T extends string>(candidate: unknown, allowed: readonly T[], fallback: T): T =>
    typeof candidate === "string" && (allowed as readonly string[]).includes(candidate)
      ? (candidate as T)
      : fallback;

  const timestamp = (candidate: unknown, fallback: string): string => {
    if (typeof candidate !== "string") return fallback;
    const parsed = Date.parse(candidate);
    if (Number.isNaN(parsed)) return fallback;
    const year = new Date(parsed).getUTCFullYear();
    if (year < 2000 || year > 2200) return fallback;
    return new Date(parsed).toISOString();
  };

  const optionalTimestamp = (candidate: unknown): string | undefined => {
    if (typeof candidate !== "string") return undefined;
    const parsed = Date.parse(candidate);
    if (Number.isNaN(parsed)) return undefined;
    const year = new Date(parsed).getUTCFullYear();
    return year < 2000 || year > 2200 ? undefined : new Date(parsed).toISOString();
  };

  const text = (candidate: unknown, max: number): string =>
    typeof candidate === "string"
      ? stripControlCharacters(candidate).trim().slice(0, max)
      : "";

  const enumArray = <T extends string>(
    candidate: unknown,
    allowed: readonly T[],
    fallback: T[],
    max: number,
  ): T[] => {
    if (!Array.isArray(candidate)) return fallback;
    const kept = [
      ...new Set(
        candidate.filter(
          (entry): entry is T =>
            typeof entry === "string" && (allowed as readonly string[]).includes(entry),
        ),
      ),
    ].slice(0, max);
    return kept.length > 0 ? kept : fallback;
  };

  const now = new Date().toISOString();
  return {
    id,
    uid,
    type: oneOf(input.type, Object.values(NotificationTypes), NotificationTypes.Custom),
    source: oneOf(
      input.source,
      Object.values(NotificationContentSources),
      NotificationContentSources.Custom,
    ),
    templateId: text(input.templateId, 128) || undefined,
    eventName: text(input.eventName, 128) || undefined,
    title: text(input.title, NOTIFICATION_LIMITS.title),
    body: text(input.body, NOTIFICATION_LIMITS.body),
    category: oneOf(
      input.category,
      Object.values(NotificationCategories),
      NotificationCategories.System,
    ),
    priority: oneOf(
      input.priority,
      Object.values(NotificationPriorities),
      NotificationPriorities.Normal,
    ),
    channels: enumArray(
      input.channels,
      Object.values(NotificationChannels),
      [NotificationChannels.InApp],
      NOTIFICATION_LIMITS.channels,
    ),
    targets: enumArray(
      input.targets,
      Object.values(NotificationTargets),
      [NotificationTargets.Center, NotificationTargets.Badge],
      NOTIFICATION_LIMITS.targets,
    ),
    route: sanitizeRoute(input.route),
    groupKey: text(input.groupKey, NOTIFICATION_LIMITS.groupKey) || undefined,
    dedupeKey,
    sound: oneOf(input.sound, Object.values(NotificationSounds), NotificationSounds.Default),
    status: oneOf(
      input.status,
      Object.values(NotificationDeliveryStatuses),
      NotificationDeliveryStatuses.Delivered,
    ),
    syncState: oneOf(
      input.syncState,
      Object.values(NotificationSyncStates),
      NotificationSyncStates.Synced,
    ),
    readAt: optionalTimestamp(input.readAt),
    displayedAt: optionalTimestamp(input.displayedAt),
    openedAt: optionalTimestamp(input.openedAt),
    dismissedAt: optionalTimestamp(input.dismissedAt),
    createdAt: timestamp(input.createdAt, now),
    updatedAt: timestamp(input.updatedAt, now),
    metadata: sanitizeMetadata(input.metadata),
  };
}

