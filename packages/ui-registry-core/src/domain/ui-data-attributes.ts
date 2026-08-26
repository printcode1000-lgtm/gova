/** The DOM attribute set produced by the UiRegistry builders. */
export type UiDataAttributes = Readonly<
  Record<"data-ui" | `data-ui-${string}` | `data-simulation-${string}`, string>
>;
