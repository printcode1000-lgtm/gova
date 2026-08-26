import type { UiDescriptor } from "../domain/ui-descriptor";
import type { UiUid } from "../domain/ui-uid";

/**
 * Where in source a pending registration belongs.
 *
 * The locator carries no file path. A production client has no idea where the
 * repository lives, and telling it would leak a developer's machine layout into
 * a database row. What it does carry is enough published metadata for tooling
 * to find the usage site *locally* and prove it is the only one: which shared
 * component rendered, which registered page route it rendered on, and the safe
 * DOM id the element already publishes.
 */
export interface UiRegistrySourceLocator {
  /** `data-ui-component` marker or the element's tag name; a safe token. */
  readonly component: string;
  /** Registered page route template — value-free, never a resolved path. */
  readonly route: string;
  /** Safe author-written DOM id that pins one usage site, when one exists. */
  readonly anchor: string | null;
}

export type UiRegistryPendingStatus = "pending" | "blocked" | "resolved";

export interface UiRegistryPendingRequestInput {
  readonly uid: UiUid;
  readonly descriptor: UiDescriptor;
  readonly locator: UiRegistrySourceLocator;
}

export interface UiRegistryPendingRequest extends UiRegistryPendingRequestInput {
  readonly id: string;
  readonly status: UiRegistryPendingStatus;
  /** Why a request could not be applied; null while it is simply waiting. */
  readonly reason: string | null;
  readonly createdAt: string;
  /** Super-admin uid taken from the verified session, never from the body. */
  readonly createdBy: string;
  readonly resolvedAt: string | null;
}

/** Any request that still needs a developer; the deploy gate refuses these. */
export function isUiRegistryPendingOpen(request: UiRegistryPendingRequest): boolean {
  return request.status !== "resolved";
}
