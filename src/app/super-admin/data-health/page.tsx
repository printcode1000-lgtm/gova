import { notFound, redirect } from "next/navigation";

import { getServerRuntimeContext } from "@/core/config/runtime-context.server";

export default function SuperAdminDataHealthRedirect() {
  if (!getServerRuntimeContext().isDevelopment) notFound();
  redirect("/dev/data-health");
}
