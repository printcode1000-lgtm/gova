/**
 * How a registered element is exercised by real-user simulation.
 *
 * Simulation used to describe what to do by picking a DOM attribute family
 * (`data-simulation-field` meant "type into this"). That made the DOM the
 * contract: renaming an attribute silently changed the meaning of a scenario.
 * Declaring the interaction on the descriptor instead puts the meaning where
 * the identity already lives, so a scenario can be validated against it before
 * a single element is touched.
 */
export const UI_INTERACTION_TYPES = ["tap", "type", "select", "toggle", "upload"] as const;

export type UiInteractionType = (typeof UI_INTERACTION_TYPES)[number];

export interface UiInteraction {
  /**
   * - `tap` — clickable actions and list rows.
   * - `type` — text-like fields.
   * - `select` — select, radio, and list-choice fields.
   * - `toggle` — switches and checkboxes.
   * - `upload` — file inputs and upload controls.
   */
  readonly type: UiInteractionType;
  /**
   * Name of a static domain contract the supplied value must satisfy.
   *
   * A contract *name*, never a value: it says "this field takes a search term",
   * not what any user typed. Values themselves are supplied by scenarios and
   * checked against the named contract, so no user text, token, URL, route
   * parameter, database value, label, or PII can enter the registry.
   */
  readonly valueContract?: string;
}
