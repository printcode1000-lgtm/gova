import { registerDataCorePorts } from "@/features/data/server";
import { uiRegistryPendingRepository } from "@asol/data-core/ui-registry";
import {
  checkUiAttributeContract,
  checkUiRegistryCoverageContract,
  violations,
} from "@asol/architecture-core";

import { applyPendingRequests } from "./apply-pending-runner";

/**
 * `ui-registry:apply-pending` — turn queued registrations into source.
 *
 * Reads the queue through the same data-core ownership the super-admin route
 * writes it with, applies only the requests whose source site it can prove is
 * unique, and re-runs the UiRegistry contract over what it wrote. Ambiguity is
 * never resolved by guessing: those requests stay pending, with the reason, and
 * the command exits non-zero so the deploy gate keeps refusing.
 */
async function main(): Promise<void> {
  // The queue lives behind data-core; the application's own ports are what
  // give this CLI the same data ownership the server route has.
  registerDataCorePorts();

  const result = await applyPendingRequests(uiRegistryPendingRepository, process.cwd());
  if (result.outcomes.length === 0) {
    console.log("UiRegistry pending queue is empty. Nothing to apply.");
    return;
  }

  console.log(`UiRegistry pending requests: ${result.outcomes.length}`);
  for (const outcome of result.outcomes) {
    if (outcome.applied) console.log(`  applied  ${outcome.request.uid} -> ${outcome.detail}`);
    else console.error(`  pending  ${outcome.request.uid}: ${outcome.detail}`);
  }

  // Whatever was written has to satisfy the same contract as a hand-written
  // registration before this command can claim success.
  checkUiAttributeContract();
  checkUiRegistryCoverageContract();
  if (violations.length > 0) {
    console.error("\nUiRegistry contract failed after applying pending requests:");
    for (const violation of violations) {
      console.error(`  - ${violation.file}: ${violation.violation}`);
    }
    process.exitCode = 1;
    return;
  }

  if (result.blocked > 0) {
    console.error(
      `\n${result.blocked} request(s) remain pending. Fix the reason above, or register the element by hand and resolve the request.`,
    );
    process.exitCode = 1;
    return;
  }
  console.log(`\nApplied ${result.applied} pending UiRegistry registration(s).`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
