import { asolApi, ASOL_API_ROUTES } from '@/core/api';
import { publicEnv } from '@/core/config/public-env';
import { categoryService } from '@/features/categories';
import "server-only";

import { configureOtaCore } from "@asol/ota-core";
import { isSuperAdminIdentity } from "@/features/auth";
import { persistentSystemLogService } from "@/features/system-logs/server";
import { createMainOtaReleaseRepository } from '@asol/data-core/ota-runtime';

/** OTA administration registration; control owns the capability, gova only routes to it. */
export { registerOtaAdminServerPorts } from './server/admin';

/**
 * The server half of the `@asol/ota-core` port registration.
 *
 * Kept apart from `ota-core-ports.ts` because `persistent-system-log-service.server`
 * reads the database directly: importing it from the browser half would pull the users
 * repository into the client bundle, which is exactly the kind of reach the seal exists
 * to prevent.
 *
 * `configureOtaCore` merges, so registering here does not clear the browser half.
 */
export function registerOtaCoreServerPorts(): void {
  configureOtaCore({
    telemetry: {
      ingestBatch: async () => undefined,
      reportFailure: () => {
        /* server-side failures go through the log service directly */
      },
      list: async (input) => {
        const page = await persistentSystemLogService.list({ limit: input.limit });
        return page.items.map((entry) => ({
          feature: entry.feature,
          operation: entry.operation,
          message: entry.message,
          occurrences: entry.occurrences,
        }));
      },
    },
    identity: { isSuperAdmin: isSuperAdminIdentity },
    httpApi: asolApi,
    apiRoutes: ASOL_API_ROUTES,
    publicEnv: {
      otaPublicKey: publicEnv.otaPublicKey,
      otaManifestUrl: publicEnv.otaManifestUrl,
      webBundleVersion: publicEnv.webBundleVersion,
    },
    categories: {
      getMainCategories: () => categoryService.getMainCategories(),
      getCollections: () => categoryService.getCollections(),
      getCategoryTree: (categoryId) => categoryService.getCategoryTree(categoryId),
    },
    releaseRepository: createMainOtaReleaseRepository(),
  });
}
