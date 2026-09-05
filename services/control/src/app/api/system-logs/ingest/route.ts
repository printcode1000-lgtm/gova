import { jsonContractResponse } from '@asol/api-contract-core/server';
import { controlPreflight } from '@/control/operational-route';
import { isIngestRateLimited, normalizeIngestPayload, persistentSystemLogService, readBoundedJsonBody, systemLogError, validateIngestBatchSize } from '@/control/system-logs';
import type { SystemLogInput } from '@asol/system-logs-core/server';

export async function POST(request: Request): Promise<Response> {
  if (isIngestRateLimited(request)) return jsonContractResponse({ error: 'systemLogRateLimited' }, { status: 429 });
  try {
    const body = await readBoundedJsonBody<Partial<SystemLogInput> | Partial<SystemLogInput>[]>(request);
    const values = Array.isArray(body) ? body : [body]; const batchError = validateIngestBatchSize(values);
    if (batchError) return jsonContractResponse({ error: batchError }, { status: 413 });
    await persistentSystemLogService.addBatch(values.map(normalizeIngestPayload).filter((entry) => entry.level !== 'normal'), 'untrusted-client');
    return jsonContractResponse({ ok: true });
  } catch (error) { return systemLogError(error); }
}
export function OPTIONS(request: Request): Response {
  return controlPreflight(request);
}
