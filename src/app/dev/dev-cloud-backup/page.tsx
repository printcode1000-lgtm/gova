import { notFound } from "next/navigation";

import { getServerRuntimeContext } from "@/core/config/runtime-context.server";
import { DevCloudBackupPage } from "@/modules/dev-cloud-backup";

export default function DevCloudBackupRoute() {
  if (!getServerRuntimeContext().isDevelopment) notFound();
  return <DevCloudBackupPage />;
}
