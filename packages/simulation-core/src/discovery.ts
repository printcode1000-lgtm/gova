export type {
  DiscoveredPageInteractions,
  DiscoveredUserPage,
  InteractionBaseline,
  InteractionBaselineEntry,
} from "./discovery/discovery.types";
export { discoverUserPages } from "./discovery/user-page-discovery";
export { discoverPageInteractionSources } from "./discovery/interaction-source-discovery";
export { INTERACTION_BASELINE } from "./discovery/interaction-baseline";
export { assertSimulationCoverage, type SimulationCoverageReport } from "./discovery/coverage-guard";
