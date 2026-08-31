import { getProductionDeployCallbackBaseUrl } from '@/core/config/control-env';
import { controlJson, gitHubDeployError } from '@/control/operational-route';
import { getGitHubProductionDeployStatus, startGitHubProductionDeploy } from '@/features/release-commands/server/services/production-deploy-service.server';
import { verifyGitHubPushIdentity } from '@asol/vercel-deploy-core/github-push-identity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function callbackUrl(request: Request): string {
  const base = getProductionDeployCallbackBaseUrl() || new URL(request.url).origin;
  return `${base.replace(/\/+$/, '')}/api/super-admin/production-deploy/callback`;
}

async function identity(request: Request) {
  const authorization = request.headers.get('authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) throw new Error('githubDeployIdentityRejected');
  return verifyGitHubPushIdentity(authorization.slice('Bearer '.length).trim());
}

export async function POST(request: Request): Promise<Response> {
  try {
    const github = await identity(request);
    return controlJson(await startGitHubProductionDeploy({ revision: github.revision, callbackUrl: callbackUrl(request) }), 202);
  } catch (error) { return gitHubDeployError(error); }
}

export async function GET(request: Request): Promise<Response> {
  try {
    await identity(request);
    const requestId = new URL(request.url).searchParams.get('requestId')?.trim() ?? '';
    if (!requestId) return controlJson({ error: 'invalidJsonBody' }, 400);
    const result = await getGitHubProductionDeployStatus(requestId);
    return result ? controlJson(result) : controlJson({ error: 'requestFailed' }, 404);
  } catch (error) { return gitHubDeployError(error); }
}
