import { apiSuccess, mapServiceError, readJsonBody } from "@/core/api/api-response";
import { notificationsServer } from "@/features/notifications/server";
import { assertSignedInRequest } from "@/features/auth/server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

/**
 * Resolve the FCM tokens a native sender may push to for its own grants.
 *
 * The caller is the verified session; each grant must also name it as actor.
 */
export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/notifications/recipient-tokens",
    async () => {
      try {
        const claims = assertSignedInRequest(request);
        const body = (await readJsonBody<unknown>(request)) as {
          grants?: unknown;
        };
        const result = await notificationsServer.resolveRecipientTokensForGrants({
          uid: claims.uid,
          phone: claims.phone,
          grants: Array.isArray(body?.grants) ? body.grants : [],
        });
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
