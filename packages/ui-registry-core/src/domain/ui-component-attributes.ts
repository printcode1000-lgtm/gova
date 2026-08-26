import type { UiDataAttributes } from "./ui-data-attributes";
import type { UiState } from "./ui-state";
import { statesToValue } from "./ui-state-value";
import { assertUiToken } from "./ui-token";

/** Identifies a shared component even when its caller has no logical action id. */
export function uiComponentAttributes(
  component: string,
  state?: UiState | readonly UiState[],
): UiDataAttributes {
  const normalizedComponent = assertUiToken(component, "UI component");
  const normalizedState = statesToValue(state);
  return {
    "data-ui": "component",
    "data-ui-component": normalizedComponent,
    ...(normalizedState ? { "data-ui-state": normalizedState } : {}),
  };
}
