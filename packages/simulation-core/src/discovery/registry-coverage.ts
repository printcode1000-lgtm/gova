import {
  ambiguousUiSimulationIds,
  uiSimulationTarget,
} from "@asol/ui-registry-core";

import { USER_PAGE_REGISTRY } from "../registries/user-page-registry";

/**
 * Coverage as a question about the registry, not about the DOM.
 *
 * The old check scanned source for `data-simulation-*` attributes and compared
 * the strings it happened to find against the strings scenarios happened to
 * use. Both halves were incidental: an attribute could be renamed and the scan
 * would simply find a different set.
 *
 * Now every step names a uid. A uid the generated UiSimulationRegistry does not
 * know, a target with no registered interaction, or a step performing an
 * interaction the element is not registered for is a contract failure reported
 * here — with the page, the interaction, the uid and the reason — instead of
 * surfacing later as "element not found" in a browser nobody is watching.
 */
export function uiRegistryCoverageProblems(): string[] {
  const problems: string[] = [];
  for (const page of USER_PAGE_REGISTRY) {
    for (const interaction of page.interactions) {
      const targets = [
        ...interaction.actions.flatMap((action) => (action.type === "wait" ? [] : [action.target])),
        ...(interaction.unavailableWhen ? [interaction.unavailableWhen.target] : []),
      ];
      for (const target of targets) {
        const record = uiSimulationTarget(target.targetUid);
        if (!record) {
          problems.push(
            `${page.id}:${interaction.id}: uid ${target.targetUid} (${target.simulationId}) is not in the generated UiSimulationRegistry`,
          );
          continue;
        }
        if (!record.routes.includes(page.route)) {
          problems.push(
            `${page.id}:${interaction.id}: uid ${target.targetUid} is not rendered by ${page.route}`,
          );
        }
        if (target.kind === "state") continue;
        if (!record.interaction) {
          problems.push(
            `${page.id}:${interaction.id}: uid ${target.targetUid} has no registered interaction`,
          );
          continue;
        }
        if (record.interaction.type !== target.interaction) {
          problems.push(
            `${page.id}:${interaction.id}: uid ${target.targetUid} is registered as "${record.interaction.type}" but the step performs "${target.interaction}"`,
          );
        }
      }
    }
  }
  for (const id of ambiguousUiSimulationIds()) {
    problems.push(`simulation id "${id}" resolves to more than one uid`);
  }
  return problems.sort();
}

/** Throws with every problem at once, so one run reports the whole drift. */
export function assertUiRegistrySimulationCoverage(): void {
  const problems = uiRegistryCoverageProblems();
  if (problems.length > 0) {
    throw new Error(`simulationTargetRegistryDrift\n${problems.join("\n")}`);
  }
}
