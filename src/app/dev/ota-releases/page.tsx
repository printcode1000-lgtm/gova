import { notFound, redirect } from "next/navigation";

import { getServerRuntimeContext } from "@/core/config/runtime-context.server";

export default function DevOtaReleasesRoute() {
  if (!getServerRuntimeContext().isDevelopment) notFound();
  redirect("/dev/release-console?tab=ota-releases");
}
