import type { NotificationEntity } from "./entities";

/**
 * Which deliveries must never become a banner.
 *
 * A data-only signal carries no text for a reader: it exists to update a card
 * that is already stored. Giving one a banner and a sound would ring the
 * sender's phone every time a recipient opened their message.
 *
 * This is a domain rule, not an adapter detail — the same answer has to hold
 * for the Android tray, the foreground presenter, and the service worker — so
 * it lives here rather than inside any one of them.
 */

/**
 * The `specialtyChatKind` a receipt payload carries.
 *
 * A wire value, deliberately duplicated rather than imported: the notification
 * module must not depend on the features that send through it, and this string
 * is already fixed by clients in the field.
 */
const RECEIPT_KIND_MARKER = "specialty_receipt";

/** True when the payload is a signal rather than something to show a reader. */
export function isDataOnlyDelivery(entity: NotificationEntity): boolean {
  const metadata = entity.metadata ?? {};
  if (String(metadata.dataOnly ?? "") === "true") return true;
  if (String(metadata.specialtyChatKind ?? "") === RECEIPT_KIND_MARKER) return true;
  // A receipt from any future sender, recognised by shape instead of by name.
  if (metadata.receiptStatus !== undefined && metadata.targetMessageId !== undefined) {
    return true;
  }
  return !entity.title.trim() && !entity.body.trim();
}
