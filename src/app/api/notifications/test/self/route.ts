import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { notificationsServer } from "@/features/notifications/server";
import { assertSignedInRequest } from "@/features/auth/server";
import { runTracedBusinessRoute } from "@/core/api/traced-route";

export const runtime = "nodejs";

/**
 * The account's own delivery test.
 *
 * The body carries a locale and a request id and nothing else: the identity is
 * the verified session, and the notification's text lives in
 * `@asol/notifications-core`, so no caller-supplied content is ever pushed.
 */
export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/notifications/test/self",
    async () => {
      try {
        const claims = assertSignedInRequest(request);
        const body = (await request.json().catch(() => ({}))) as {
          locale?: unknown;
          requestId?: unknown;
        };
        return apiSuccess(
          await notificationsServer.sendSelfTestNotification({
            identity: { uid: claims.uid, phone: claims.phone },
            locale: body?.locale === "en" ? "en" : "ar",
            ...(typeof body?.requestId === "string"
              ? { requestId: body.requestId }
              : {}),
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
