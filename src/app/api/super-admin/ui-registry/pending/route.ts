import "server-only";

import type { UiRegistryPendingRequest } from "@asol/ui-registry-core";

import { apiError } from "@/core/api/api-response";
import {
  UnsafeUiRegistryPendingRequestError,
  listOpenUiRegistryPendingRequests,
  runSuperAdminJsonRoute,
  runSuperAdminRoute,
  submitUiRegistryPendingRequest,
} from "@/features/super-admin/server";

/**
 * The pending UiRegistry queue, behind the super-admin session boundary.
 *
 * `runSuperAdminRoute` verifies the signed session before the handler runs, so
 * an unauthenticated or non-super-admin caller never reaches the queue. The
 * body is rebuilt field by field by the server service, which is what keeps
 * page text, form values, and tokens out of the stored row: they have no field
 * to arrive in.
 */
export const POST = (request: Request) =>
  runSuperAdminJsonRoute<unknown, UiRegistryPendingRequest>(
    "POST /api/super-admin/ui-registry/pending",
    request,
    async ({ admin, body }) => {
      try {
        // The author is the verified session, never a value the client sent.
        return await submitUiRegistryPendingRequest(body, admin.uid);
      } catch (error) {
        if (error instanceof UnsafeUiRegistryPendingRequestError) {
          return apiError(error.message, 400);
        }
        throw error;
      }
    },
  );

export const GET = (request: Request) =>
  runSuperAdminRoute<{ requests: UiRegistryPendingRequest[] }>(
    "GET /api/super-admin/ui-registry/pending",
    request,
    async () => ({ requests: await listOpenUiRegistryPendingRequests() }),
  );
