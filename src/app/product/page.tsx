import { Suspense } from "react";
import { ProductPageContent } from "@/features/product/presentation/ProductPageContent";

export default function ProductPage() {
  return (
    <Suspense fallback={null}>
      <ProductPageContent />
    </Suspense>
  );
}
