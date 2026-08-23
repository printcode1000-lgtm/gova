import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import {
  notificationsServer,
  type NotificationTestInput,
} from "@/features/notifications/server";
import { assertSuperAdminRequest } from "@/features/super-admin/server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export const runtime = "nodejs";

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/notifications/test/send",
    async () => {
      try {
        const claims = assertSuperAdminRequest(request);
        const body = (await request.json()) as NotificationTestInput;
        return apiSuccess(
          await notificationsServer.sendTestNotification({
            ...body,
            identity: { uid: claims.uid, phone: claims.phone },
          }),
        );
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
