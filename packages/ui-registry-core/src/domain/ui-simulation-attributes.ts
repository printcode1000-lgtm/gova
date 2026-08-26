import type { UiSimulationTarget, UiSimulationTargetKind } from "./ui-simulation-target";
import { assertUiToken } from "./ui-token";

function simulationAttributeName(kind: UiSimulationTargetKind): `data-simulation-${string}` {
  if (kind === "event") return "data-simulation-target";
  if (kind === "field") return "data-simulation-field";
  if (kind === "list-item") return "data-simulation-list-item";
  if (kind === "state") return "data-simulation-state";
  return "data-simulation-file";
}

/** Emits the single simulation marker that addresses this exact element. */
export function simulationAttributes(
  simulation: UiSimulationTarget | undefined,
): Record<`data-simulation-${string}`, string> {
  if (!simulation) return {};
  return {
    [simulationAttributeName(simulation.kind)]: assertUiToken(
      simulation.id,
      "Simulation id",
    ),
  };
}
