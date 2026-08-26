import 'server-only';

import { uiRegistryPendingRepository } from '@asol/data-core/ui-registry';
import {
  validateUiRegistryPendingRequest,
  type UiRegistryPendingRequest,
} from '@asol/ui-registry-core';

export class UnsafeUiRegistryPendingRequestError extends Error {
  constructor(reason: string) {
    super(`Unsafe pending UiRegistry request: ${reason}`);
    this.name = 'UnsafeUiRegistryPendingRequestError';
  }
}

/**
 * Server service for the UiRegistry pending queue.
 *
 * The API route stays a thin door: this is where the untrusted body is rebuilt
 * into a safe request and where the repository is reached. The author is the
 * verified super-admin uid the route resolved from the signed session, never a
 * value the client sent.
 */
export async function submitUiRegistryPendingRequest(
  body: unknown,
  adminUid: string,
): Promise<UiRegistryPendingRequest> {
  const validation = validateUiRegistryPendingRequest(body);
  if (!validation.ok) {
    throw new UnsafeUiRegistryPendingRequestError(validation.reason);
  }
  return uiRegistryPendingRepository.submit(validation.request, adminUid);
}

/** Every request a developer still has to apply. */
export function listOpenUiRegistryPendingRequests(): Promise<UiRegistryPendingRequest[]> {
  return uiRegistryPendingRepository.listOpen();
}
