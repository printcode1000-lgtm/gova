export type {
  PageInteractionDefinition,
  SimulationDriverAction,
  SimulationExecutionPort,
  SimulationProgressStatus,
  SimulationProgressStep,
  SimulationRunResult,
  SimulationRuntime,
  SimulationRuntimeInput,
  SimulationTarget,
  SimulationTargetKind,
  SimulationUser,
  SimulationUserRole,
  UserPageDefinition,
} from "./domain/simulation.types";
export { USER_PAGE_REGISTRY, pageInteractionById, userPageById } from "./registries/user-page-registry";
export { SIMULATION_USERS, simulationUserByRole } from "./registries/simulation-users";
export { SIMULATION_SCENARIOS, type SimulationScenarioDefinition } from "./registries/scenario-registry";
export { resolveSimulationRuntime } from "./runtime/environment";
export { pickRandomSimulationImage, pickRandomSimulationImages } from "./runtime/random-image";
export { runPageInteraction, type RunPageInteractionInput } from "./runtime/simulation-runner";
