import "server-only";

import { getControlNotificationsUrl } from "@/core/config/control-env";

interface NotificationSendResponse {
  accepted?: number;
}

/** Deliver production-deploy grants when no super-admin browser is open. */
export async function deliverProductionDeployNotificationGrants(
  grants: readonly string[],
): Promise<void> {
  if (grants.length === 0) return;
  const baseUrl = getControlNotificationsUrl();
  if (!baseUrl) throw new Error("notificationsServiceUrlNotConfigured");
  const response = await fetch(`${baseUrl}/api/notifications/send`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ grants }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`notificationGrantDeliveryFailed:${response.status}`);
  const result = await response.json() as NotificationSendResponse;
  if (result.accepted !== grants.length) {
    throw new Error(`notificationGrantDeliveryIncomplete:${result.accepted ?? 0}/${grants.length}`);
  }
}
