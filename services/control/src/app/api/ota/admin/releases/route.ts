import { controlPreflight } from '@/control/operational-route';
import { otaError, otaReleaseService } from '@/control/ota-admin';
import type { SetOtaReleaseApprovalInput } from '@asol/ota-core/admin';

export async function GET(request: Request): Promise<Response> {
  try { const url = new URL(request.url); return Response.json(await otaReleaseService.getAdminDashboard({ uid: url.searchParams.get('uid') ?? '', phone: url.searchParams.get('phone') ?? '' })); }
  catch (error) { return otaError(error); }
}
export async function PUT(request: Request): Promise<Response> {
  try { return Response.json(await otaReleaseService.setApproval(await request.json() as SetOtaReleaseApprovalInput)); }
  catch (error) { return otaError(error); }
}
export function OPTIONS(request: Request): Response {
  return controlPreflight(request);
}
