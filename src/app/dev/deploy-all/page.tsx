import { notFound } from "next/navigation";

import { getServerRuntimeContext } from "@/core/config/runtime-context.server";
import { DeployRunbookPage } from "@/modules/google-play-console/presentation/DeployRunbookPage";

export default function DevDeployRunbookRoute() {
  if (!getServerRuntimeContext().isDevelopment) notFound();
  return <DeployRunbookPage />;
}
