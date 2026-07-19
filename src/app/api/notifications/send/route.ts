import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { notificationSendService } from "@/features/notifications/services/notification-service.bootstrap.server";
import type { SendNotificationToUsersInput } from "@/features/notifications/domain/entities";
import { runTracedBusinessRoute } from "../../auth/traced-route";
import { getNotificationInternalSecret } from "@/core/config/server-env";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

function isAuthorized(request: Request): boolean {
  const value =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const expected = getNotificationInternalSecret();
  if (value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

export async function POST(request: Request) {
  return runTracedBusinessRoute("POST /api/notifications/send", async () => {
    try {
      if (!isAuthorized(request)) throw new Error("forbidden");
      const body = (await request.json()) as SendNotificationToUsersInput;
      const result = await notificationSendService.sendToUsers(body);
      return apiSuccess(result);
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
