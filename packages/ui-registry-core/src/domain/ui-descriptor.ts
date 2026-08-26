import type { UiElementKind } from "./ui-element-kind";
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
  /** Optional real-user simulation address for this exact UI element. */
  readonly simulation?: UiSimulationTarget;
}
