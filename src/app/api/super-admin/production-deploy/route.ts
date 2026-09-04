import { getProductionDeployCallbackBaseUrl } from "@/core/config/control-env";
import { runSuperAdminJsonRoute, runSuperAdminRoute } from "@/features/super-admin/server";
import {
  getProductionDeployStatus,
  startProductionDeploy,
} from "@/features/release-commands/server";
import type { StartRemoteDeployAllInput } from "@asol/vercel-deploy-core/remote-deploy-contracts";

/** The sandbox runner reports back here; the URL must be the public origin. */
function callbackUrl(request: Request): string {
  const base = getProductionDeployCallbackBaseUrl() || new URL(request.url).origin;
  return `${base.replace(/\/+$/, "")}/api/super-admin/production-deploy/callback`;
}

export async function GET(request: Request) {
  return runSuperAdminRoute(
    "GET /api/super-admin/production-deploy",
    request,
    ({ admin }) => getProductionDeployStatus(admin.uid),
  );
}

export async function POST(request: Request) {
  return runSuperAdminJsonRoute<StartRemoteDeployAllInput, unknown>(
    "POST /api/super-admin/production-deploy",
    request,
    ({ admin, body }) =>
      startProductionDeploy({
        adminUid: admin.uid,
        confirmation: body?.confirmation ?? "",
        callbackUrl: callbackUrl(request),
        command:
          body?.command === "deploy:all" || body?.command === "deploy:push"
            ? body.command
            : undefined,
        deployAllOptions: body?.deployAllOptions,
      }),
  );
}
