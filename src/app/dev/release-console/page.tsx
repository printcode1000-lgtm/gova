import { notFound } from "next/navigation";

import { getServerRuntimeContext } from "@/core/config/runtime-context.server";
import { ReleaseConsolePage } from "@/modules/google-play-console";

/**
 * Deliberately not `force-dynamic`: the catalog and android runbooks are
 * compile-time constants from `@asol/release-core/console`, and this route is
 * part of `output: "export"`, which rejects a force-dynamic page.
 */
export default function ReleaseConsoleRoute() {
  if (!getServerRuntimeContext().isDevelopment) notFound();
  return <ReleaseConsolePage />;
}
