import { notFound } from "next/navigation";

import { getServerRuntimeContext } from "@/core/config/runtime-context.server";
import { DataHealthPage } from "@/features/data-health";

export default function DataHealthRoute() {
  if (!getServerRuntimeContext().isDevelopment) notFound();
  return <DataHealthPage />;
}
