import {
  uiAttributes,
  uiComponentAttributes,
  type UiDataAttributes,
  type UiDescriptor,
  type UiState,
} from '@asol/ui-registry-core';

/**
 * Resolves the UiRegistry attributes of one shared primitive instance.
 *
 * A primitive is generic by nature: the same component renders in dozens of
 * places, so it can never own a uid of its own — a uid baked into a helper
 * would repeat across every instance and stop being an identity. The caller
 * therefore passes an explicit per-instance `UiDescriptor`, and this helper
 * only forwards it. Callers that pass nothing fall back to the unregistered
 * component marker, which carries no uid at all.
 */
export function uiPrimitiveAttributes(
  component: string,
  ui: UiDescriptor | undefined,
  state?: UiState,
): UiDataAttributes {
  return ui
    ? uiAttributes({ ...ui, state: state ?? ui.state })
    : uiComponentAttributes(component, state);
}
