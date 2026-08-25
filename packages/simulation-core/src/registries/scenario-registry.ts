export interface SimulationScenarioDefinition {
  id: string;
  label: string;
  participantIds: readonly string[];
  interactionIds: readonly string[];
}

/** Scenarios are intentionally empty in the first release. */
export const SIMULATION_SCENARIOS: readonly SimulationScenarioDefinition[] = [];
