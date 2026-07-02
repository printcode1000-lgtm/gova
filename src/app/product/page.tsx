import { Suspense } from "react";

import { ProductPageContent } from "@/components/product/ProductPageContent";

export default function ProductPage() {
  return (
    <Suspense fallback={null}>
      <ProductPageContent />
    </Suspense>
  );
}
