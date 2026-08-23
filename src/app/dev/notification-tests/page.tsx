import { notFound } from "next/navigation";

import { getServerRuntimeContext } from "@/core/config/runtime-context.server";
import { SuperAdminNotificationTestsPage } from "@/features/super-admin/presentation/SuperAdminNotificationTestsPage";

/**
 * Development-only surface: it sends real notifications to real devices.
 *
 * Under `/dev` it is excluded from the static export by
 * `STATIC_ROUTE_IGNORELIST`, so it never reaches the mobile bundle or `out/`,
 * and the guard below returns 404 in production.
 */
export const dynamic = "force-dynamic";

export default function DevNotificationTestsRoute() {
  if (!getServerRuntimeContext().isDevelopment) notFound();
  return <SuperAdminNotificationTestsPage />;
}
