import { handleProductionDeployCallback } from '@/features/release-commands/server/services/production-deploy-service.server';
import { controlError, controlJson } from '@/control/operational-route';
import type { RemoteDeployAllCallbackInput } from '@asol/vercel-deploy-core/remote-deploy-contracts';
import { readJsonContractBody } from '@asol/api-contract-core/server';

/**
 * A malformed body is the caller's fault, not the server's.
 *
 * `request.json()` throws a `SyntaxError`, which the shared mapping cannot tell
 * from a server-side parse failure and would report as `500`. The application
 * distinguishes them with `readJsonBody`; this is the same distinction.
 */
async function readCallbackBody(request: Request): Promise<RemoteDeployAllCallbackInput> {
  try {
    return await readJsonContractBody<RemoteDeployAllCallbackInput>(request);
  } catch {
    throw new Error('invalidJsonBody');
  }
}

/** Signed machine callback from the persistent release sandbox. */
export async function POST(request: Request): Promise<Response> {
  try {
    const authorization = request.headers.get('authorization') ?? '';
    const providedSecret = authorization.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : null;
    return controlJson(await handleProductionDeployCallback({
      providedSecret,
      payload: await readCallbackBody(request),
    }));
  } catch (error) { return controlError(error); }
}
