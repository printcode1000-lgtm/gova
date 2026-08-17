import { notFound } from "next/navigation";

import { getServerRuntimeContext } from "@/core/config/runtime-context.server";
import { DataHealthPage } from "@/modules/data-health";

export default function DataHealthRoute() {
  if (!getServerRuntimeContext().isDevelopment) notFound();
  return <DataHealthPage />;
}
