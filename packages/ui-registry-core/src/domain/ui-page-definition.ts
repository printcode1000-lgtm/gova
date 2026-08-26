import type { UiUid } from "./ui-uid";

/** One registered App Router page identity. */
export interface UiPageDefinition {
  /** App Router pathname template. Dynamic segment values are never rendered. */
  readonly route: string;
  /** Stable, human-readable page identity. */
  readonly id: string;
  /** Globally unique, stable registry address for this page. */
  readonly uid: UiUid;
}
