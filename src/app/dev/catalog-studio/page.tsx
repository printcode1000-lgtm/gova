import { notFound } from "next/navigation";

import { isDevelopment } from "@/core/config";
import { CatalogStudioPage } from "@/features/catalog-studio";

export default function CatalogStudioRoute() {
  if (!isDevelopment) notFound();
  return <CatalogStudioPage />;
}
