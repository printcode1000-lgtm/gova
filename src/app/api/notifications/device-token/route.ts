import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { notificationTokenService } from "@/features/notifications/services/notification-service.bootstrap.server";
import type {
  DeleteNotificationTokenInput,
  RegisterNotificationTokenInput,
} from "@/features/notifications/domain/entities";
import { runTracedBusinessRoute } from "../../auth/traced-route";

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/notifications/device-token",
    async () => {
      try {
        const body = (await request.json()) as RegisterNotificationTokenInput;
        const token = await notificationTokenService.register(body);
        return apiSuccess(token);
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}

export async function DELETE(request: Request) {
  return runTracedBusinessRoute(
    "DELETE /api/notifications/device-token",
    async () => {
      try {
        const { searchParams } = new URL(request.url);
        const input: DeleteNotificationTokenInput = {
          uid: searchParams.get("uid") ?? "",
          phone: searchParams.get("phone") ?? "",
          deviceId: searchParams.get("deviceId") ?? undefined,
          tokenId: searchParams.get("tokenId") ?? undefined,
        };
        await notificationTokenService.remove(input);
        return apiSuccess({ deleted: true });
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
