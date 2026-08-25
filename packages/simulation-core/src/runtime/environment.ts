import type {
  SimulationRuntime,
  SimulationRuntimeInput,
} from "../domain/simulation.types";

export function resolveSimulationRuntime(
  input: SimulationRuntimeInput,
): SimulationRuntime {
  if (input.platform === "android") return "android";
  if (input.platform === "ios") return "ios";
  if (input.deployment === "static-export") return "static-out";
  if (input.deployment === "local-development") return "development";
  return "production";
}
