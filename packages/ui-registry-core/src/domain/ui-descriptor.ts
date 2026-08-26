import type { UiElementKind } from "./ui-element-kind";
import type { UiInteraction } from "./ui-interaction";
import type { UiSimulationTarget } from "./ui-simulation-target";
import type { UiState } from "./ui-state";
import type { UiUid } from "./ui-uid";

/** The declarative identity of one UI element. */
export interface UiDescriptor {
  /**
   * Globally unique, stable registry address for this element. Required for
   * every explicitly registered element; generic shared primitives that carry
   * only a component marker have no uid by design.
   */
  readonly uid: UiUid;
  /** Stable logical name relative to the active page or component scope. */
  readonly id: string;
  readonly kind?: UiElementKind;
  readonly state?: UiState | readonly UiState[];
  readonly action?: string;
  readonly part?: string;
  /**
   * How real-user simulation exercises this element.
   *
   * Required for any descriptor that participates in simulation: the scenario
   * step is validated against it before the DOM is touched. Generic primitives
   * never declare one — an interaction belongs to the registered instance.
   */
  readonly interaction?: UiInteraction;
  /**
   * Optional scenario/event identifier for this element.
   *
   * It is not the identity: `uid` addresses the element, `simulation.id` names
   * the event a scenario refers to, and one id resolves to exactly one uid.
   */
  readonly simulation?: UiSimulationTarget;
}
