import { registerDataCorePorts } from "@/features/data/server";
import { uiRegistryPendingRepository } from "@asol/data-core/ui-registry";

/**
 * Deploy gate for the UiRegistry pending queue — fail closed, always.
 *
 * A queued request means a super admin found a control the registry cannot
 * address. Shipping past it publishes a build whose inspector, diagnostics, and
 * simulation cannot name that control, and the request would then describe a
 * source tree that is already gone.
 *
 * Unreadable is also a refusal. "No answer" is not "no pending work", and a
 * release that cannot check its own queue has not proven anything.
 */
async function main(): Promise<void> {
  // The queue lives behind data-core; the application's own ports are what
  // give this CLI the same data ownership the server route has.
  registerDataCorePorts();
  let open;
  try {
    open = await uiRegistryPendingRepository.listOpen();
  } catch (error) {
    console.error("UiRegistry pending queue could not be read, so the deploy cannot proceed.");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
    return;
  }

  if (open.length === 0) {
    console.log("UiRegistry pending queue is empty.");
    return;
  }

  console.error(`UiRegistry has ${open.length} unresolved registration request(s):`);
  for (const request of open) {
    console.error(
      `  - ${request.uid} (${request.status}) on ${request.locator.route}` +
        `${request.reason ? `: ${request.reason}` : ""}`,
    );
  }
  console.error("\nRun `npm run ui-registry:apply-pending`, then commit the applied registrations.");
  process.exitCode = 1;
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
