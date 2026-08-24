import { notFound } from "next/navigation";

import { getServerRuntimeContext } from "@/core/config/runtime-context.server";
import { ReleaseConsolePage } from "@/features/google-play-console/ui";

/**
 * Always re-evaluate: catalog and android runbooks come from @asol/release-core.
 *
 * Safe because `app/dev` is excluded from the static export by
 * `STATIC_ROUTE_IGNORELIST`.
 */
export const dynamic = "force-dynamic";
export default function ReleaseConsoleRoute() {
  if (!getServerRuntimeContext().isDevelopment) notFound();
  return <ReleaseConsolePage />;
}
