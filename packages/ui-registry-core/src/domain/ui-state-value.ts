import type { UiState } from "./ui-state";
import { assertUiToken } from "./ui-token";

/** Renders one or more validated states into a single `data-ui-state` value. */
export function statesToValue(
  state: UiState | readonly UiState[] | undefined,
): string | undefined {
  if (!state) return undefined;
  const states = Array.isArray(state) ? state : [state as UiState];
  return states.map((item) => assertUiToken(item, "UI state")).join(" ");
}
