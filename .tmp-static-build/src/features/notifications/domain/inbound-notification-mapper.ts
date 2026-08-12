import type { NotificationEntity } from "./entities";
import {
  NotificationCategories,
  NotificationChannels,
  NotificationContentSources,
  NotificationDeliveryStatuses,
  NotificationPriorities,
  NotificationSounds,
  NotificationSyncStates,
  NotificationTargets,
  NotificationTypes,
  type NotificationCategory,
  type NotificationPriority,
  type NotificationSound,
} from "./enums";
import {
  NOTIFICATION_LIMITS,
  sanitizeMetadata,
  sanitizeNotificationEntity,
  sanitizeRoute,
} from "./notification-validation";

/**
 * Turning a push payload into a notification.
 *
 * Pure and platform-free on purpose. This is the single most attacker-adjacent
 * step in the module — anyone who can get a message accepted by FCM, APNs, or
 * the browser chooses every field here — so it lives in the domain where it can
 * be tested directly with hostile input, instead of inside a Capacitor adapter
 * that needs a device to exercise.
 *
 * Everything is sanitized, never asserted: a malformed field costs that field,
 * not the notification.
 */

/**
 * The flat shape every transport delivers.
 *
 * Structurally compatible with the Native Platform's `NotificationPayload` and
 * with a service-worker push, so neither has to be imported here.
 */
export interface InboundPushPayload {
  id?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  tag?: string;
  channelId?: string;
}

/** The prefix a sender uses to pass metadata through a flat push payload. */
const METADATA_PREFIX = "meta_";

function text(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  return typeof value === "string" ? value.trim() : "";
}

function oneOf<T extends string>(value: string, allowed: readonly T[]): T | undefined {
  return (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

/**
 * A dedupe key for a payload that carries none.
 *
 * Derived from the content rather than random, so the same message delivered
 * twice — a retry, or the tray import of something already handled live —
 * collapses to one notification.
 */
function derivedIdentity(payload: InboundPushPayload, data: Record<string, unknown>): string {
  const title = payload.title || text(data, "title") || "ASOL";
  const body = payload.body || text(data, "body");
  const route = text(data, "routeHref");
  return `push:${title}:${body}:${route}`.slice(0, NOTIFICATION_LIMITS.dedupeKey);
}

/**
 * An `ASOL` shell with no data and no body.
 *
 * Some Android delivery paths surface one for a data-only message. It carries
 * nothing to show and nothing to act on, so it is never imported.
 */
export function isEmptySystemPlaceholderPayload(payload: InboundPushPayload): boolean {
  const data = payload.data ?? {};
  const hasData = Object.values(data).some(
    (value) => value !== null && value !== undefined && String(value).trim(),
  );
  const title = payload.title || text(data, "title") || "";
  const body = payload.body || text(data, "body");
  return !hasData && title.toUpperCase() === "ASOL" && !body;
}

/**
 * Map one inbound payload to a notification for `uid`.
 *
 * @returns `null` when the payload cannot produce a storable notification —
 * no owning user, or nothing that survives sanitization.
 */
export function mapInboundPushToNotification(
  uid: string,
  payload: InboundPushPayload,
): NotificationEntity | null {
  if (!uid || !payload || typeof payload !== "object") return null;

  const data = (payload.data ?? {}) as Record<string, unknown>;
  const now = new Date().toISOString();

  const id =
    text(data, "notificationId") ||
    (typeof payload.id === "string" ? payload.id.trim() : "") ||
    derivedIdentity(payload, data);
  if (!id) return null;

  const templateId = text(data, "templateId");
  const routeHref = text(data, "routeHref");
  const routeLabel = text(data, "routeLabel");

  // `meta_` keys are the flat transport encoding of the metadata object. They
  // pass through the same sanitizer as anything else, so a `meta___proto__`
  // key is dropped rather than assigned.
  const metadata = sanitizeMetadata(
    Object.fromEntries(
      Object.entries(data)
        .filter(([key]) => key.startsWith(METADATA_PREFIX) && key.length > METADATA_PREFIX.length)
        .map(([key, value]) => [key.slice(METADATA_PREFIX.length), value]),
    ),
  );

  const candidate: NotificationEntity = {
    id,
    uid,
    type: templateId ? NotificationTypes.Template : NotificationTypes.Custom,
    source: NotificationContentSources.Custom,
    templateId: templateId || undefined,
    title: payload.title || text(data, "title") || "ASOL",
    body: payload.body || text(data, "body"),
    category:
      oneOf<NotificationCategory>(text(data, "category"), Object.values(NotificationCategories)) ??
      NotificationCategories.System,
    priority:
      oneOf<NotificationPriority>(text(data, "priority"), Object.values(NotificationPriorities)) ??
      NotificationPriorities.Normal,
    channels: [NotificationChannels.InApp, NotificationChannels.AndroidPush],
    targets: [NotificationTargets.Center, NotificationTargets.Badge],
    route: routeHref
      ? sanitizeRoute({ href: routeHref, label: routeLabel || undefined })
      : undefined,
    groupKey: text(data, "groupKey") || undefined,
    dedupeKey: text(data, "dedupeKey") || id,
    sound:
      oneOf<NotificationSound>(text(data, "sound"), Object.values(NotificationSounds)) ??
      NotificationSounds.Default,
    status: NotificationDeliveryStatuses.Delivered,
    syncState: NotificationSyncStates.Synced,
    displayedAt: now,
    createdAt: text(data, "createdAt") || now,
    updatedAt: now,
    metadata,
  };

  // Run the whole thing through the standard sanitizer, so a payload can never
  // reach storage on a path that skipped a rule this mapper does not know about.
  return sanitizeNotificationEntity(candidate);
}
