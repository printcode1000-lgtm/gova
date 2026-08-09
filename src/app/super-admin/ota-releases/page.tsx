import { notFound, redirect } from "next/navigation";

import { getServerRuntimeContext } from "@/core/config/runtime-context.server";

export default function OtaReleasesAdminPage() {
  if (!getServerRuntimeContext().isDevelopment) notFound();
  redirect("/super-admin/google-play-store-assets?tab=ota-releases");
}
