import { Suspense } from "react";

import { PharmacyCatalogManagerPage } from "@/features/pharmacy-profile-catalog/ui";

export default function ProfilePharmacyCatalogPage() {
  return (
    <Suspense fallback={null}>
      <PharmacyCatalogManagerPage />
    </Suspense>
  );
}
