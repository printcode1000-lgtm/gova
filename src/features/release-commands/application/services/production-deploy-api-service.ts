import { asolApi } from "@/core/api";

import type {
  RemoteDeployAllResult,
  StartRemoteDeployAllInput,
} from "@asol/vercel-deploy-core/remote-deploy-contracts";

export const PRODUCTION_DEPLOY_API = "/api/super-admin/production-deploy";

export const productionDeployApiService = {
  status(headers?: Record<string, string>) {
    return asolApi.get<RemoteDeployAllResult>(PRODUCTION_DEPLOY_API, {
      headers,
      cache: "no-store",
    });
  },
  start(input: StartRemoteDeployAllInput, headers?: Record<string, string>) {
    return asolApi.post<RemoteDeployAllResult>(PRODUCTION_DEPLOY_API, input, { headers });
  },
};
