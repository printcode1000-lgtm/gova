import { asolApi, ASOL_API_ROUTES } from '@/core/api';
import { publicEnv } from '@/core/config/public-env';
import { categoryService } from '@/features/categories';
import { configureOtaCore } from "@asol/ota-core";
import { isSuperAdminIdentity } from "@/features/auth";
import { persistentSystemLogApiService } from "@/features/system-logs";
import {
  reportPreAuthFailure,
  type PreAuthFailureContext,
} from "@/features/system-logs/pre-auth-failure-reporter";
import type { PersistentSystemLogInput } from "@/features/system-logs";

/**
 * Wires the application into `@asol/ota-core`'s ports.
 *
 * The dependency used to run the other way: `ota-core` imported
 * `@/features/system-logs/*` and `@/features/auth/utils/super-admin` directly, so a
 * sealed package knew the application's feature internals. Rule 7 runs both ways.
 *
 * The direction is now inverted — the application registers what the package needs, and
 * the package names only interfaces. **This module is the seam**, and it is the only
 * place that may know both sides.
 *
 * Registration is browser-side. The server half (`telemetry.list`, used by the release
 * console) is registered separately in `ota-core-ports.server.ts`, because
 * `persistent-system-log-service.server` must never reach a browser bundle.
 *
 * Not calling this is safe rather than fatal: telemetry falls back to a no-op and the
 * super-admin predicate fails closed. A forgotten registration costs log lines, never
 * updates.
 */
export function registerOtaCorePorts(): void {
  configureOtaCore({
    telemetry: {
      ingestBatch: (entries) =>
        persistentSystemLogApiService.ingestBatch(
          entries as unknown as PersistentSystemLogInput[],
        ),
      // The port accepts a broad context; the reporter accepts only primitives. The
      // seam narrows it here rather than widening the reporter, which other callers rely
      // on to keep objects out of log fields.
      reportFailure: (label, error, context, level) =>
        reportPreAuthFailure(
          label,
          error,
          (context ?? {}) as PreAuthFailureContext,
          (level ?? "error") as Parameters<typeof reportPreAuthFailure>[3],
        ),
      // Server-only; the browser half never reads logs back.
      list: async () => [],
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
  });
}
