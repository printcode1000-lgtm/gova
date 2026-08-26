/** Diagnostic lifecycle vocabulary rendered as `data-ui-state`. */
export const UI_STATES = [
  "idle",
  "loading",
  "success",
  "error",
  "empty",
  "disabled",
] as const;

export type UiState = (typeof UI_STATES)[number];
