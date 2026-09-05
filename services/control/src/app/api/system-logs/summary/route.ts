import { jsonContractResponse } from '@asol/api-contract-core/server';
import { controlPreflight } from '@/control/operational-route';
import { assertControlSystemLogAccess, persistentSystemLogService, systemLogError } from '@/control/system-logs';
export async function GET(request: Request): Promise<Response> { try { assertControlSystemLogAccess(request); return jsonContractResponse(await persistentSystemLogService.summary()); } catch (error) { return systemLogError(error); } }
export function OPTIONS(request: Request): Response {
  return controlPreflight(request);
}
