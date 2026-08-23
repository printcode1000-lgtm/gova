import { notFound } from "next/navigation";

import { getServerRuntimeContext } from "@/core/config/runtime-context.server";
import { ReleaseConsolePage } from "@/modules/google-play-console";

/** Always re-evaluate: catalog and android runbooks come from @asol/release-core. */
export const dynamic = "force-dynamic";

export default function ReleaseConsoleRoute() {
  if (!getServerRuntimeContext().isDevelopment) notFound();
  return <ReleaseConsolePage />;
}
