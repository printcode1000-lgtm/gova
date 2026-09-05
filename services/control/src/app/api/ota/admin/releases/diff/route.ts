import { jsonContractResponse } from '@asol/api-contract-core/server';
import { controlPreflight } from '@/control/operational-route';
import { otaError, otaReleaseService } from '@/control/ota-admin';
export async function GET(request: Request): Promise<Response> {
  try { const url = new URL(request.url); return jsonContractResponse(await otaReleaseService.getReleaseDiff({ identity: { uid: url.searchParams.get('uid') ?? '', phone: url.searchParams.get('phone') ?? '' }, baseReleaseId: url.searchParams.get('baseReleaseId') ?? '' })); }
  catch (error) { return otaError(error); }
}
export function OPTIONS(request: Request): Response {
  return controlPreflight(request);
}
