import { apiSuccess, mapServiceError, readJsonBody } from "@/core/api/api-response";
import {
  notificationsServer,
  type BroadcastNotificationInput,
} from "@/features/notifications/server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export const runtime = "nodejs";

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/notifications/broadcast/send",
    async () => {
      try {
        const body = (await readJsonBody<unknown>(request)) as BroadcastNotificationInput;
        return apiSuccess(await notificationsServer.sendBroadcast(body));
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
