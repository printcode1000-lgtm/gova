import { apiSuccess, mapServiceError } from '@/core/api/api-response';
import { assertDevelopmentToolingAllowed } from '@/core/config/development-guard.server';
import {
  assertSuperAdminRequest,
  readLiveCloudAccountsR2Contents,
} from '@/features/super-admin/server';

export async function GET(request: Request) {
  try {
    assertDevelopmentToolingAllowed('cloudAccountsDevelopmentOnly', { strict: true });
    assertSuperAdminRequest(request);
    return apiSuccess(await readLiveCloudAccountsR2Contents());
  } catch (error) {
    return mapServiceError(error);
  }
}
