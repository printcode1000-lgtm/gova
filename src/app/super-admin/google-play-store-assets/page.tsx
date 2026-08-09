import { notFound } from "next/navigation";

import { getServerRuntimeContext } from "@/core/config/runtime-context.server";
import { ReleaseConsolePage } from "@/modules/google-play-console";

export default function SuperAdminGooglePlayStoreAssetsRoute() {
  if (!getServerRuntimeContext().isDevelopment) notFound();
  return <ReleaseConsolePage />;
}
