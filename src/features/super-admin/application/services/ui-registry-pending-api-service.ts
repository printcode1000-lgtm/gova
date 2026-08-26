import { asolApi } from "@/core/api";
import type {
  UiRegistryPendingRequest,
  UiRegistryPendingRequestInput,
} from "@asol/ui-registry-core";

const PENDING_ROUTE = "/api/super-admin/ui-registry/pending";

/**
 * Client half of the pending UiRegistry queue.
 *
 * It goes through `asolApi`, so the same call works in development, in the web
 * app, and from the static bundle running inside the Android and iOS shells —
 * those resolve the configured remote API base URL instead of a local route.
 * The session token is sent explicitly; the server verifies it and refuses
 * anything that is not a super admin.
 */
class UiRegistryPendingApiService {
  submit(
    request: UiRegistryPendingRequestInput,
    sessionToken: string,
  ): Promise<UiRegistryPendingRequest> {
    return asolApi.post<UiRegistryPendingRequest>(PENDING_ROUTE, request, {
      headers: { "x-asol-session-token": sessionToken },
    });
  }

  list(sessionToken: string): Promise<{ requests: UiRegistryPendingRequest[] }> {
    return asolApi.get<{ requests: UiRegistryPendingRequest[] }>(PENDING_ROUTE, {
      headers: { "x-asol-session-token": sessionToken },
    });
  }
}

export const uiRegistryPendingApiService = new UiRegistryPendingApiService();
