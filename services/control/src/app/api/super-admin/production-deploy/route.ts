import {
  getProductionDeployStatus,
  startProductionDeploy,
} from '@/features/release-commands/server/services/production-deploy-service.server';
import { getProductionDeployCallbackBaseUrl } from '@/core/config/control-env';
import { runControlSuperAdminJsonRoute, runControlSuperAdminRoute } from '@/control/super-admin-route';
import type { StartRemoteDeployAllInput } from '@asol/vercel-deploy-core/remote-deploy-contracts';

/**
 * `deploy:revision` is deliberately absent.
 *
 * A revision deploy targets an exact commit authenticated by the GitHub OIDC
 * route, which has its own entry point. Accepting it from a Super Admin session
 * would let the console deploy a commit no push event vouched for.
 */
type ConsoleDeployBody = Omit<StartRemoteDeployAllInput, 'command' | 'revision'> & {
  command?: 'deploy:all' | 'deploy:push';
};

function callbackUrl(request: Request): string {
  const base = getProductionDeployCallbackBaseUrl() || new URL(request.url).origin;
  return `${base.replace(/\/+$/, '')}/api/super-admin/production-deploy/callback`;
}

export async function GET(request: Request) {
  return runControlSuperAdminRoute(request, ({ admin }) => getProductionDeployStatus(admin.uid));
}

export async function POST(request: Request) {
  return runControlSuperAdminJsonRoute<ConsoleDeployBody, unknown>(request, ({ admin, body }) =>
    startProductionDeploy({ adminUid: admin.uid, confirmation: body?.confirmation ?? '', callbackUrl: callbackUrl(request), command: body?.command, target: body?.target, deployAllOptions: body?.deployAllOptions }),
  );
}
