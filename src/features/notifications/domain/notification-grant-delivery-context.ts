/**
 * Who is carrying notification grants on this device.
 *
 * Native delivery calls two session-bound routes — recipient tokens and the
 * mobile push unlock — so it needs the signed session, not just uid/phone.
 * Auth updates this leaf; the account-bridge reads it without importing the
 * auth feature graph.
 */

export interface NotificationGrantDeliveryIdentity {
  uid: string;
  phone: string;
  sessionToken: string;
}

let deliveryIdentity: NotificationGrantDeliveryIdentity | null = null;

export function setNotificationGrantDeliveryIdentity(
  identity: NotificationGrantDeliveryIdentity | null,
): void {
  if (
    !identity?.uid?.trim() ||
    !identity?.phone?.trim() ||
    !identity?.sessionToken?.trim()
  ) {
    deliveryIdentity = null;
    return;
  }
  deliveryIdentity = {
    uid: identity.uid.trim(),
    phone: identity.phone.trim(),
    sessionToken: identity.sessionToken.trim(),
  };
}

export function getNotificationGrantDeliveryIdentity(): NotificationGrantDeliveryIdentity | null {
  return deliveryIdentity;
}
