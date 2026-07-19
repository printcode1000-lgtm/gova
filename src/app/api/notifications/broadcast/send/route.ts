import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { notificationBroadcastService } from "@/features/notifications/services/notification-service.bootstrap.server";
import type { BroadcastNotificationInput } from "@/features/notifications/domain/entities";
import { runTracedBusinessRoute } from "../../../auth/traced-route";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/notifications/broadcast/send",
    async () => {
      try {
        const body = (await request.json()) as BroadcastNotificationInput;
        return apiSuccess(await notificationBroadcastService.send(body));
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
