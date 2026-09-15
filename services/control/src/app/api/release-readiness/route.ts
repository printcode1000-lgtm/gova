import { timingSafeEqual } from 'node:crypto';

import { readJsonContractBody } from '@asol/api-contract-core/server';
import type { RemoteDeployAllCallbackInput } from '@asol/vercel-deploy-core/remote-deploy-contracts';

import { controlError, controlJson } from '@/control/operational-route';
import { applyControlReleaseReadinessMutation } from '@/control/release-readiness';
import { getProductionDeployCallbackSecret } from '@/core/config/control-env';

function secretsMatch(provided: string, expected: string): boolean {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Signed machine-only write boundary for exact-SHA release readiness. */
export async function POST(request: Request): Promise<Response> {
  try {
    const expected = getProductionDeployCallbackSecret();
    if (!expected) throw new Error('productionDeployNotConfigured');
    const authorization = request.headers.get('authorization') ?? '';
    const provided = authorization.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : '';
    if (!provided || !secretsMatch(provided, expected)) {
      throw new Error('productionDeployCallbackRejected');
    }
    const payload = await readJsonContractBody<RemoteDeployAllCallbackInput>(request);
    if (!payload.releaseStateMutation) throw new Error('invalidJsonBody');
    await applyControlReleaseReadinessMutation(payload.releaseStateMutation);
    return controlJson({ received: true });
  } catch (error) {
    return controlError(error);
  }
}
