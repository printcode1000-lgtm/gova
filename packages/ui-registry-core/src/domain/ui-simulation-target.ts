/** A simulation address declared beside the element's stable UI identity. */
export type UiSimulationTargetKind =
  | "event"
  | "field"
  | "list-item"
  | "file"
  | "state";

export interface UiSimulationTarget {
  readonly kind: UiSimulationTargetKind;
  /** Stable simulation registry id; never a resource or user value. */
  readonly id: string;
}
