import { notFound } from "next/navigation";

import { getServerRuntimeContext } from "@/core/config/runtime-context.server";
import { DeployRunbookPage } from "@/modules/google-play-console/presentation/DeployRunbookPage";

/**
 * Deliberately not `force-dynamic`: the runbook and command catalog are
 * compile-time constants from `@asol/release-core/console`, and this route is
 * part of `output: "export"`, which rejects a force-dynamic page.
 */
export default function DevDeployRunbookRoute() {
  if (!getServerRuntimeContext().isDevelopment) notFound();
  return <DeployRunbookPage />;
}
