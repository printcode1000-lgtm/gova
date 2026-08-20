import { Suspense } from "react";
import { ProductSearchPageContent } from "@/features/product-search/presentation/ProductSearchPageContent";

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <ProductSearchPageContent />
    </Suspense>
  );
}
