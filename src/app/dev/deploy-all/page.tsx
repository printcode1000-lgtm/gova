import { notFound } from "next/navigation";

import { getServerRuntimeContext } from "@/core/config/runtime-context.server";
import { DeployRunbookPage } from "@/modules/google-play-console/presentation/DeployRunbookPage";

/** Always re-evaluate: runbook/commands come from @asol/release-core at request time. */
export const dynamic = "force-dynamic";

export default function DevDeployRunbookRoute() {
  if (!getServerRuntimeContext().isDevelopment) notFound();
  return <DeployRunbookPage />;
}
