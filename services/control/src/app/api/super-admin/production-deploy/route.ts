import {
  getProductionDeployStatus,
  startProductionDeploy,
} from '@/features/release-commands/server/services/production-deploy-service.server';
import { getProductionDeployCallbackBaseUrl } from '@/core/config/control-env';
import { runControlSuperAdminJsonRoute, runControlSuperAdminRoute } from '@/control/super-admin-route';
import type { StartRemoteDeployAllInput } from '@asol/vercel-deploy-core/remote-deploy-contracts';

/**
 * The console selects intent, never a commit.
 *
 * There is no revision form to accept: the sandbox always checks out the tip of
 * `main`, so a console request cannot name a commit no one pushed. `command` is
 * narrowed here anyway, because a body is caller-supplied input.
 */
type ConsoleDeployBody = Omit<StartRemoteDeployAllInput, 'command'> & {
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
    startProductionDeploy({ adminUid: admin.uid, confirmation: body?.confirmation ?? '', callbackUrl: callbackUrl(request), command: body?.command, deployAllOptions: body?.deployAllOptions }),
  );
}
