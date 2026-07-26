import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { googlePlayConsoleEnvironment } from "@/modules/google-play-console/domain/development-guard.server";
import { googlePlayConsoleService } from "@/modules/google-play-console/services/google-play-console-service.server";
import { runTracedBusinessRoute } from "../../auth/traced-route";

export async function GET(request: Request) {
  return runTracedBusinessRoute(
    "GET /api/super-admin/google-play-console",
    async () => {
      try {
        assertSuperAdminRequest(request);
        if (!googlePlayConsoleEnvironment().allowed) {
          return apiSuccess({
            environment: googlePlayConsoleEnvironment(),
            fetchedAt: new Date().toISOString(),
            config: {
              packageName: "",
              keyFilePath: "",
              keyFileExists: false,
              serviceAccountEmail: "",
              serviceAccountProjectId: "",
              serviceAccountUniqueId: "",
            },
            editId: null,
            endpoints: [],
            summary: {
              successfulEndpoints: 0,
              failedEndpoints: 0,
              tracks: 0,
              releases: 0,
              listings: 0,
              reviews: 0,
              inAppProducts: 0,
              subscriptions: 0,
            },
          });
        }
        return apiSuccess(await googlePlayConsoleService.snapshot());
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}
