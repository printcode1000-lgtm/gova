import { jsonContractResponse, readJsonContractBody } from '@asol/api-contract-core/server';
import { controlPreflight } from '@/control/operational-route';
import { otaError, otaReleaseService } from '@/control/ota-admin';

interface OtaAccessBody {
  releaseId?: string;
  version?: string;
  identity?: {
    uid: string;
    phone: string;
  };
  installationId?: string;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonContractBody<OtaAccessBody>(request);
    return jsonContractResponse(await otaReleaseService.getAccess({
      releaseId: body.releaseId?.trim() ?? '',
      version: body.version?.trim() ?? '',
      identity: body.identity,
      installationId: body.installationId?.trim(),
    }));
  } catch (error) {
    return otaError(error);
  }
}

export function OPTIONS(request: Request): Response {
  return controlPreflight(request);
}
