import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import type { NotificationTestInput } from "@/features/notifications/domain/entities";
import { notificationBroadcastService } from "@/features/notifications/services/notification-service.bootstrap.server";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { runTracedBusinessRoute } from "../../../auth/traced-route";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/notifications/test/send",
    async () => {
      try {
        const claims = assertSuperAdminRequest(request);
        const body = (await request.json()) as NotificationTestInput;
        return apiSuccess(
          await notificationBroadcastService.sendTest({
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
