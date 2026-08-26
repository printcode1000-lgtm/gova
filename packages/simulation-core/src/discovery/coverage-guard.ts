import { USER_PAGE_REGISTRY } from "../registries/user-page-registry";
import { INTERACTION_BASELINE } from "./interaction-baseline";
import { discoverPageInteractionSources } from "./interaction-source-discovery";
import { assertUiRegistrySimulationCoverage } from "./registry-coverage";
import { discoverUserPages } from "./user-page-discovery";

export interface SimulationCoverageReport {
  pages: number;
  events: number;
  interactionSources: number;
}

function sameValues(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/**
 * Target coverage now comes from the generated UiSimulationRegistry.
 *
 * Scanning source for `data-simulation-*` strings answered "does some element
 * somewhere carry this marker". The registry answers the question that
 * actually matters: is this uid registered, on this page, with this
 * interaction.
 */
function assertRegisteredTargetsExist(): void {
  assertUiRegistrySimulationCoverage();
}

export function assertSimulationCoverage(root = process.cwd()): SimulationCoverageReport {
  assertRegisteredTargetsExist();
  const discovered = discoverUserPages(root);
  const actualRoutes = discovered.map((page) => page.route);
  const registeredRoutes = USER_PAGE_REGISTRY.map((page) => page.route).sort((a, b) => a.localeCompare(b));
  if (!sameValues(actualRoutes, registeredRoutes)) {
    const missing = actualRoutes.filter((route) => !registeredRoutes.includes(route));
    const stale = registeredRoutes.filter((route) => !actualRoutes.includes(route));
    throw new Error(
      `simulationPageCoverageDrift\nMissing: ${missing.join(", ") || "none"}\nStale: ${stale.join(", ") || "none"}`,
    );
  }

  let interactionSources = 0;
  for (const sourcePage of discovered) {
    const registered = USER_PAGE_REGISTRY.find((page) => page.route === sourcePage.route)!;
    const current = discoverPageInteractionSources(sourcePage, root);
    const baseline = INTERACTION_BASELINE[sourcePage.route];
    const eventIds = registered.interactions.map((event) => event.id);
    if (!baseline) throw new Error(`simulationInteractionBaselineMissing:${sourcePage.route}`);
    if (baseline.sourceDigest !== current.sourceDigest || baseline.interactionSourceCount !== current.interactionSourceCount) {
      throw new Error(
        `simulationInteractionCoverageDrift:${sourcePage.route}\n` +
          `Expected ${baseline.interactionSourceCount} interaction sources (${baseline.sourceDigest}); ` +
          `found ${current.interactionSourceCount} (${current.sourceDigest}).`,
      );
    }
    if (!sameValues([...baseline.eventIds], eventIds)) {
      throw new Error(`simulationEventRegistryDrift:${sourcePage.route}`);
    }
    interactionSources += current.interactionSourceCount;
  }

  return {
    pages: USER_PAGE_REGISTRY.length,
    events: USER_PAGE_REGISTRY.reduce((total, page) => total + page.interactions.length, 0),
    interactionSources,
  };
}
