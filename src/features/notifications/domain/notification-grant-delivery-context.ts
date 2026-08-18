/**
 * Who is carrying notification grants on this device.
 *
 * Native delivery needs uid/phone to call the main app's recipient-token API.
 * Auth updates this leaf; the account-bridge reads it without importing the
 * auth feature graph.
 */

export interface NotificationGrantDeliveryIdentity {
  uid: string;
  phone: string;
}

let deliveryIdentity: NotificationGrantDeliveryIdentity | null = null;

export function setNotificationGrantDeliveryIdentity(
  identity: NotificationGrantDeliveryIdentity | null,
): void {
  if (!identity?.uid?.trim() || !identity?.phone?.trim()) {
    deliveryIdentity = null;
    return;
  }
  deliveryIdentity = {
    uid: identity.uid.trim(),
    phone: identity.phone.trim(),
  };
}

export function getNotificationGrantDeliveryIdentity(): NotificationGrantDeliveryIdentity | null {
  return deliveryIdentity;
}
