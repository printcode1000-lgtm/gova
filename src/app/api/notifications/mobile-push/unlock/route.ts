import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { notificationsServer } from "@/features/notifications/server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/notifications/mobile-push/unlock",
    async () => {
      try {
        const body = (await request.json()) as {
          uid: string;
          phone: string;
          credentialBlob: string;
        };
        const credentials = await notificationsServer.unlockMobilePushCredentials(body);
        return apiSuccess(credentials);
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
