import "server-only";

import { asolApi } from "@/core/api/asol-api-client";
import { getNotificationsPublicUrl } from "@/core/config/public-env";

interface NotificationSendResponse {
  accepted?: number;
}

/** Deliver production-deploy grants when no super-admin browser is open. */
export async function deliverProductionDeployNotificationGrants(
  grants: readonly string[],
): Promise<void> {
  if (grants.length === 0) return;
  const baseUrl = getNotificationsPublicUrl();
  if (!baseUrl) throw new Error("notificationsServiceUrlNotConfigured");
  const result = await asolApi.postAbsoluteJson<NotificationSendResponse>(
    `${baseUrl.replace(/\/+$/, "")}/api/notifications/send`,
    { grants },
    { cache: "no-store", suppressErrorLog: true },
  );
  if (result.accepted !== grants.length) {
    throw new Error(`notificationGrantDeliveryIncomplete:${result.accepted ?? 0}/${grants.length}`);
  }
}
