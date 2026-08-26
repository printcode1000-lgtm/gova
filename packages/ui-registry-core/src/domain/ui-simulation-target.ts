/** A simulation address declared beside the element's stable UI identity. */
export const SIMULATION_TARGET_KINDS = [
  "event",
  "field",
  "list-item",
  "file",
  "state",
] as const;

export type UiSimulationTargetKind = (typeof SIMULATION_TARGET_KINDS)[number];

export interface UiSimulationTarget {
  readonly kind: UiSimulationTargetKind;
  /** Stable simulation registry id; never a resource or user value. */
  readonly id: string;
}
