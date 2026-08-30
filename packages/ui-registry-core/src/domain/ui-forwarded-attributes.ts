import { uiAttributes } from "./ui-attributes";
import { composeUiInstanceId, type UiInstanceId } from "./ui-instance";
import type { UiDataAttributes } from "./ui-data-attributes";
import type { UiDescriptor } from "./ui-descriptor";
import type { UiState } from "./ui-state";

/**
 * Applies a caller-owned canonical descriptor to the real DOM sink while
 * optionally composing a local repeated-copy instance. The uid/id/interaction
 * metadata remain owned by the caller; only runtime instance scope is added.
 */
export function uiForwardedAttributes(
  ui: UiDescriptor,
  localInstance?: UiInstanceId,
  state?: UiState,
): UiDataAttributes {
  const instance = localInstance
    ? composeUiInstanceId(ui.instance, localInstance)
    : ui.instance;
  return uiAttributes({
    ...ui,
    ...(instance ? { instance } : {}),
    ...(state !== undefined ? { state } : {}),
  });
}
