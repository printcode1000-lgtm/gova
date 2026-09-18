import { apiSuccess, mapServiceError } from '@/core/api/api-response';
import { assertDevelopmentToolingAllowed } from '@/core/config/development-guard.server';
import {
  assertSuperAdminRequest,
  readLiveCloudAccountsTursoUsage,
} from '@/features/super-admin/server';

export async function GET(request: Request) {
  try {
    assertDevelopmentToolingAllowed('cloudAccountsDevelopmentOnly', { strict: true });
    assertSuperAdminRequest(request);
    return apiSuccess(await readLiveCloudAccountsTursoUsage());
  } catch (error) {
    return mapServiceError(error);
  }
}
