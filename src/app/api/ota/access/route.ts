import { apiSuccess, mapServiceError, readJsonBody } from '@/core/api/api-response';
import { otaReleaseService } from '@asol/ota-core/server';
import type { OtaIdentity } from '@asol/ota-core';
import { runTracedBusinessRoute } from '@/core/api/traced-route';
import { registerOtaCoreServerPorts } from "@/features/ota/server";

// Supplies ota-core with the server-side log reader and the super-admin predicate.
// Without it the release console would render with no adoption data and no admin.
registerOtaCoreServerPorts();

interface OtaAccessBody {
  releaseId?: string;
  version?: string;
  identity?: OtaIdentity;
  installationId?: string;
}

export async function POST(request: Request) {
  return runTracedBusinessRoute('POST /api/ota/access', async () => {
    try {
      const body = (await readJsonBody<unknown>(request)) as OtaAccessBody;
      return apiSuccess(
        await otaReleaseService.getAccess({
          releaseId: body.releaseId?.trim() ?? '',
          version: body.version?.trim() ?? '',
          identity: body.identity,
          installationId: body.installationId?.trim(),
        }),
      );
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
