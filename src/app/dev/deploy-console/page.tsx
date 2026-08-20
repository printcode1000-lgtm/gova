import { notFound } from "next/navigation";

import { getServerRuntimeContext } from "@/core/config/runtime-context.server";
import { DeployConsolePage } from "@/modules/deploy-console";

export default function DeployConsoleRoute() {
  if (!getServerRuntimeContext().isDevelopment) notFound();
  return <DeployConsolePage />;
}
