import { apiSuccess, mapServiceError, readJsonBody } from "@/core/api/api-response";
import { runTracedBusinessRoute } from "@/core/api/traced-route";
import { handleProductionDeployCallback } from "@/features/release-commands/server";
import type { RemoteDeployAllCallbackInput } from "@asol/vercel-deploy-core/remote-deploy-contracts";

/**
 * Machine door for the sandbox runner.
 *
 * Deliberately not a super-admin route: the caller is the release sandbox, not
 * a signed-in browser, and it authenticates with the shared callback secret
 * only. It carries no ability to start anything.
 */
export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/super-admin/production-deploy/callback",
    async () => {
      try {
        const authorization = request.headers.get("authorization") ?? "";
        const providedSecret = authorization.startsWith("Bearer ")
          ? authorization.slice("Bearer ".length).trim()
          : null;
        return apiSuccess(
          await handleProductionDeployCallback({
            providedSecret,
            payload: await readJsonBody<RemoteDeployAllCallbackInput>(request),
          }),
        );
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}
