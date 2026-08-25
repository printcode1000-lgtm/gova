import type { SimulationRuntime } from "@asol/simulation-core";

export function simulationRuntimeLabel(runtime: SimulationRuntime): string {
  const labels: Record<SimulationRuntime, string> = {
    "static-out": "Static Out",
    android: "Android",
    ios: "iOS",
    development: "Development",
    production: "Production",
  };
  return labels[runtime];
}
