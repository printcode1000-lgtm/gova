import { ProductPageContent } from "@/components/product/ProductPageContent";
import type { ProductMode } from "@/components/product/product-component.types";

interface ProductPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProductPage({ searchParams }: ProductPageProps) {
  const query = searchParams ? await searchParams : {};
  const requestedMode = first(query.mode);
  const mode: ProductMode =
    requestedMode === "edit" || requestedMode === "new"
      ? requestedMode
      : "view";
  return (
    <ProductPageContent
      mode={mode}
      productId={first(query.productId) ?? ""}
      mainCategoryId={first(query.mainCategoryId) ?? ""}
      subcategoryId={first(query.subcategoryId) ?? ""}
    />
  );
}
