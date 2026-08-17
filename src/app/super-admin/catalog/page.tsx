import { notFound, redirect } from "next/navigation";

import { isDevelopment } from "@/core/config";

export default function SuperAdminCatalogStudioRedirect() {
  if (!isDevelopment) notFound();
  redirect("/dev/catalog-studio");
}
