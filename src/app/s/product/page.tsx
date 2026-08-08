import type { Metadata } from "next";
import { Suspense } from "react";

import { ProductPageContent } from "@/components/product/ProductPageContent";
import {
  loadPublicProductShareRecord,
  productShareMetadata,
} from "@/features/sharing/index.server";

interface ProductSharePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  searchParams,
}: ProductSharePageProps): Promise<Metadata> {
  const params = await searchParams;
  const productId = params.productId;
  return productShareMetadata(typeof productId === "string" ? productId : "");
}

export default async function ProductSharePage({
  searchParams,
}: ProductSharePageProps) {
  const params = await searchParams;
  const productId =
    typeof params.productId === "string" ? params.productId : "";
  const initialProduct = productId
    ? await loadPublicProductShareRecord(productId).catch(() => null)
    : null;
  return (
    <Suspense fallback={null}>
      <ProductPageContent initialProduct={initialProduct} />
    </Suspense>
  );
}
