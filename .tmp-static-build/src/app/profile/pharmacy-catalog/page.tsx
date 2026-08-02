import { Suspense } from "react";

import { PharmacyCatalogManagerPage } from "@/features/pharmacy-profile-catalog/components/PharmacyCatalogManagerPage";

export default function ProfilePharmacyCatalogPage() {
  return (
    <Suspense fallback={null}>
      <PharmacyCatalogManagerPage />
    </Suspense>
  );
}
