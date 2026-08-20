import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { notificationsServer } from "@/features/notifications/server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function GET(request: Request) {
  return runTracedBusinessRoute(
    "GET /api/notifications/preferences",
    async () => {
      try {
        const { searchParams } = new URL(request.url);
        const preference = await notificationsServer.getPushPreference({
          uid: searchParams.get("uid") ?? "",
          phone: searchParams.get("phone") ?? "",
        });
        return apiSuccess(preference);
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/notifications/preferences",
    async () => {
      try {
        const body = (await request.json()) as {
          uid: string;
          phone: string;
          pushEnabled: boolean;
        };
        if (typeof body.pushEnabled !== "boolean") {
          throw new Error("notificationPreferenceInvalid");
        }
        const preference = await notificationsServer.setPushPreference(body);
        return apiSuccess(preference);
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
