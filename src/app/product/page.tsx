import { Suspense } from "react";
import { ProductPageContent } from "@/features/product/ui";

export default function ProductPage() {
  return (
    <Suspense fallback={null}>
      <ProductPageContent id='app-product-page-productpagecontent-1-xectah' />
    </Suspense>
  );
}
