import { apiSuccess, mapServiceError, readJsonBody } from "@/core/api/api-response";
import { notificationsServer } from "@/features/notifications/server";
import { assertSignedInRequest } from "@/features/auth/server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

/**
 * Decrypt the embedded mobile push credentials for a signed-in device.
 *
 * The identity is the verified session, never a uid/phone pair from the body:
 * both are guessable, and the answer is a Firebase Admin key.
 */
export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/notifications/mobile-push/unlock",
    async () => {
      try {
        const claims = assertSignedInRequest(request);
        const body = (await readJsonBody<unknown>(request)) as {
          credentialBlob?: unknown;
        };
        const credentials = await notificationsServer.unlockMobilePushCredentials({
          uid: claims.uid,
          phone: claims.phone,
          credentialBlob:
            typeof body?.credentialBlob === "string" ? body.credentialBlob : "",
        });
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
