import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { notificationsServer } from "@/features/notifications/server";
import { assertSignedInRequest } from "@/features/auth/server/session-request.server";
import { runTracedBusinessRoute } from "@/core/api/traced-route";

export const runtime = "nodejs";

/** Every device registered on the calling account. Never returns a push token. */
export async function GET(request: Request) {
  return runTracedBusinessRoute("GET /api/notifications/devices", async () => {
    try {
      const claims = assertSignedInRequest(request);
      return apiSuccess(
        await notificationsServer.listAccountDevices({
          uid: claims.uid,
          phone: claims.phone,
        }),
      );
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

/** Revoke one device's registration by its device id. */
export async function DELETE(request: Request) {
  return runTracedBusinessRoute(
    "DELETE /api/notifications/devices",
    async () => {
      try {
        const claims = assertSignedInRequest(request);
        const deviceId =
          new URL(request.url).searchParams.get("deviceId")?.trim() ?? "";
        if (!deviceId) throw new Error("notificationDeviceIdInvalid");
        await notificationsServer.removeDeviceToken({
          uid: claims.uid,
          phone: claims.phone,
          deviceId,
        });
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
