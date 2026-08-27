import { apiError, apiSuccess, mapServiceError } from "@/core/api/api-response";
import { getProductionDeployCallbackBaseUrl } from "@/core/config/server-env";
import { runTracedBusinessRoute } from "@/core/api/traced-route";
import {
  getGitHubProductionDeployStatus,
  startGitHubProductionDeploy,
} from "@/features/release-commands/server";
import { verifyGitHubPushIdentity } from "@asol/vercel-deploy-core/github-push-identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function callbackUrl(request: Request): string {
  const base = getProductionDeployCallbackBaseUrl() || new URL(request.url).origin;
  return `${base.replace(/\/+$/, "")}/api/super-admin/production-deploy/callback`;
}

async function identity(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) throw new Error("githubDeployIdentityRejected");
  return verifyGitHubPushIdentity(authorization.slice("Bearer ".length).trim());
}

function routeError(error: unknown): Response {
  const message = error instanceof Error ? error.message : "";
  if (message === "githubDeployIdentityRejected") {
    return apiError("forbidden", 401, { skipPersistence: true });
  }
  if (message === "githubDeployNotConfigured") {
    return apiError("productionDeployNotConfigured", 503, { skipPersistence: true });
  }
  return mapServiceError(error);
}

export async function POST(request: Request): Promise<Response> {
  return runTracedBusinessRoute("POST /api/super-admin/production-deploy/github", async () => {
    try {
      const github = await identity(request);
      return apiSuccess(
        await startGitHubProductionDeploy({
          revision: github.revision,
          callbackUrl: callbackUrl(request),
        }),
        202,
      );
    } catch (error) {
      return routeError(error);
    }
  });
}

export async function GET(request: Request): Promise<Response> {
  return runTracedBusinessRoute("GET /api/super-admin/production-deploy/github", async () => {
    try {
      await identity(request);
      const requestId = new URL(request.url).searchParams.get("requestId")?.trim() ?? "";
      if (!requestId) return apiError("invalidJsonBody", 400, { skipPersistence: true });
      const result = await getGitHubProductionDeployStatus(requestId);
      return result ? apiSuccess(result) : apiError("requestFailed", 404, { skipPersistence: true });
    } catch (error) {
      return routeError(error);
    }
  });
}
