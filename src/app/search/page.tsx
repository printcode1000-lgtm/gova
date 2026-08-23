import { Suspense } from "react";
import { ProductSearchPageContent } from "@/features/product-search/ui";

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <ProductSearchPageContent />
    </Suspense>
  );
}
