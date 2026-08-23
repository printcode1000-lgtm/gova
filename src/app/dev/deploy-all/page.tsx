import { notFound } from "next/navigation";

import { getServerRuntimeContext } from "@/core/config/runtime-context.server";
import { DeployRunbookPage } from "@/features/google-play-console/ui";

/**
 * Always re-evaluate: runbook/commands come from @asol/release-core.
 *
 * Safe because `app/dev` is excluded from the static export by
 * `STATIC_ROUTE_IGNORELIST`.
 */
export const dynamic = "force-dynamic";
export default function DevDeployRunbookRoute() {
  if (!getServerRuntimeContext().isDevelopment) notFound();
  return <DeployRunbookPage />;
}
