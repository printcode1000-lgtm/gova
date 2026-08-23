import { Suspense } from "react";
import { ProductPageContent } from "@/features/product/ui";

export default function ProductPage() {
  return (
    <Suspense fallback={null}>
      <ProductPageContent />
    </Suspense>
  );
}
