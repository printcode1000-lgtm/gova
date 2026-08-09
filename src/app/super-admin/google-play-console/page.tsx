import { notFound, redirect } from "next/navigation";

import { getServerRuntimeContext } from "@/core/config/runtime-context.server";

export default function SuperAdminGooglePlayConsoleRoute() {
  if (!getServerRuntimeContext().isDevelopment) notFound();
  redirect("/super-admin/google-play-store-assets?tab=play-console");
}
