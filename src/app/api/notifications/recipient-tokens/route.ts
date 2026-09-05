import { apiSuccess, mapServiceError, readJsonBody } from "@/core/api/api-response";
import { notificationsServer } from "@/features/notifications/server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/notifications/recipient-tokens",
    async () => {
      try {
        const body = (await readJsonBody<unknown>(request)) as {
          uid: string;
          phone: string;
          grants: string[];
        };
        const result = await notificationsServer.resolveRecipientTokensForGrants(body);
        return apiSuccess(result);
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
