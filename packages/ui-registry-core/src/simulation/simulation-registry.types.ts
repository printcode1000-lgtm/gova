import type { UiElementKind } from "../domain/ui-element-kind";
import type { UiInteraction } from "../domain/ui-interaction";
import type { UiSimulationTargetKind } from "../domain/ui-simulation-target";
import type { UiUid } from "../domain/ui-uid";

/**
 * One simulated element, as the generator found it in the registry.
 *
 * Every field is derived: the descriptor supplies uid, semantic id, kind,
 * interaction and simulation id; the import graph supplies the routes that can
 * render it. Nothing here is maintained by hand, so there is no second catalog
 * to drift from the first.
 */
export interface UiSimulationTargetRecord {
  readonly uid: UiUid;
  /** Semantic identity — descriptive metadata, never a locator. */
  readonly id: string;
  readonly kind: UiElementKind;
  readonly interaction: UiInteraction;
  /** Scenario/event identifier, when the element declares one. */
  readonly simulationId: string | null;
  /**
   * Legacy instrumentation family, kept so the runner can preserve the exact
   * behaviour each kind had — notably that a list row resolves to the first
   * match rather than demanding uniqueness.
   */
  readonly simulationKind: UiSimulationTargetKind | null;
  /** Registered page routes whose source graph can render this element. */
  readonly routes: readonly string[];
  /** True when the element renders once per row of a runtime collection. */
  readonly repeated: boolean;
  /** Repository-relative source of the descriptor, for guard diagnostics. */
  readonly sourceFile: string;
  readonly sourceLine: number;
}
