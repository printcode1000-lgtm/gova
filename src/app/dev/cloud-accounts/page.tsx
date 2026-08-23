import { notFound } from "next/navigation";

import { getServerRuntimeContext } from "@/core/config/runtime-context.server";
import { SuperAdminCloudAccountsPage } from "@/features/super-admin/ui";

/**
 * Always re-evaluate: account tables are derived from sealed package
 * declarations.
 *
 * Lives under `/dev` because this is a development-only reference, and that
 * scope is what keeps it out of every shipped surface: `app/dev` is excluded
 * from the static export by `STATIC_ROUTE_IGNORELIST`, so it never reaches the
 * mobile bundle or `out/`, and the guard below returns 404 in production.
 *
 * Under `/super-admin` it was none of those things. It exported into the mobile
 * bundle, where its `"use client"` tree pulled `@asol/account-declarations` —
 * whose entries carry `requiredEnv`/`optionalEnv` — into a static chunk, and
 * `auditStaticMobilePushSecurity` failed the release over an inventory of
 * server secret names. `output: "export"` also rejects a force-dynamic page
 * outright, so the route could not be both exported and current.
 */
export const dynamic = "force-dynamic";

export default function DevCloudAccountsRoute() {
  if (!getServerRuntimeContext().isDevelopment) notFound();
  return <SuperAdminCloudAccountsPage />;
}
