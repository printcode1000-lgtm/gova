import { notFound, redirect } from "next/navigation";

import { getServerRuntimeContext } from "@/core/config/runtime-context.server";

export default function SuperAdminDevCloudBackupRedirect() {
  if (!getServerRuntimeContext().isDevelopment) notFound();
  redirect("/dev/dev-cloud-backup");
}
