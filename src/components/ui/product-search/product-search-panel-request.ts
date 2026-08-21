import type { ProductRecord } from "@/features/product/entities/product.entity";
import {
  productSearchApiService,
  type ProductSearchFilters,
  type ProductSearchMode,
  type ProductSearchSort,
  type SellerSearchRequest,
  type SellerSearchSort,
} from "@/features/product-search";
import type { UserProfileRow } from "@/features/profile/services/profile-service.interface";

export async function runProductSearchPanelRequest({
  activeMode,
  query,
  ownerUid,
  mainCategoryId,
  subcategoryId,
  fieldKeys,
  sort,
  filters,
  includeDrafts,
  sellerMinRating,
  isCompact,
}: {
  activeMode: ProductSearchMode;
  query: string;
  ownerUid: string;
  mainCategoryId: string;
  subcategoryId: string;
  fieldKeys: string[];
  sort: ProductSearchSort | SellerSearchSort;
  filters: ProductSearchFilters;
  includeDrafts: boolean;
  sellerMinRating: SellerSearchRequest["minRating"];
  isCompact: boolean;
}): Promise<
  | { mode: "sellers"; items: UserProfileRow[]; total: number }
  | { mode: "products"; items: ProductRecord[]; total: number }
> {
  if (activeMode === "sellers") {
    const result = await productSearchApiService.searchSellers({
      q: query,
      mainCategoryId,
      subcategoryId,
      sort: sort === "name" ? "name" : "relevance",
      minRating: sellerMinRating,
      limit: isCompact ? 12 : 24,
    });
    return { mode: "sellers", items: result.items, total: result.total };
  }

  const result = await productSearchApiService.searchProducts({
    q: query,
    ownerUid,
    mainCategoryId,
    subcategoryId,
    fields: fieldKeys,
    sort: sort as ProductSearchSort,
    filters,
    includeDrafts,
    limit: isCompact ? 48 : 24,
  });
  return { mode: "products", items: result.items, total: result.total };
}
