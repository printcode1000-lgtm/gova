import { Suspense } from "react";
import { ProductSearchPageContent } from "@/components/search/ProductSearchPageContent";

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <ProductSearchPageContent />
    </Suspense>
  );
}
