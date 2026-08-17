import { notFound, redirect } from "next/navigation";

import { getServerRuntimeContext } from "@/core/config/runtime-context.server";

export default function SuperAdminGooglePlayConsoleRedirect() {
  if (!getServerRuntimeContext().isDevelopment) notFound();
  redirect("/dev/release-console?tab=play-console");
}
