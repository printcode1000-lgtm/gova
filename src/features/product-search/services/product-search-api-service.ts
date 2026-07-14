import { govaApi } from "@/core/api";
import type {
  ProductSearchField,
  ProductSearchRequest,
  ProductSearchResult,
  SellerSearchRequest,
  SellerSearchResult,
} from "../entities/product-search.types";

function productQuery(input: ProductSearchRequest) {
  const q = new URLSearchParams({
    q: input.q ?? "",
    ownerUid: input.ownerUid ?? "",
    mainCategoryId: input.mainCategoryId,
    subcategoryId: input.subcategoryId,
    fields: input.fields.join(","),
    sort: input.sort ?? "newest",
    offset: String(input.offset ?? 0),
    limit: String(input.limit ?? 24),
    includeDrafts: String(Boolean(input.includeDrafts)),
  });
  const filters = input.filters ?? {};
  if (filters.availableOnly) q.set("availableOnly", "true");
  if (filters.needsCar) q.set("needsCar", "true");
  if (filters.status) q.set("status", filters.status);
  if (filters.minRating) q.set("minRating", filters.minRating);
  return q;
}

function sellerQuery(input: SellerSearchRequest) {
  const q = new URLSearchParams({
    q: input.q ?? "",
    mainCategoryId: input.mainCategoryId,
    subcategoryId: input.subcategoryId,
    sort: input.sort ?? "relevance",
    offset: String(input.offset ?? 0),
    limit: String(input.limit ?? 24),
  });
  if (input.minRating) q.set("minRating", input.minRating);
  return q;
}

export const productSearchApiService = {
  getFields(mainCategoryId: string, subcategoryId: string) {
    const q = new URLSearchParams({ mainCategoryId, subcategoryId });
    return govaApi.get<{ fields: ProductSearchField[] }>(
      `/api/search/fields?${q.toString()}`,
      { cache: "no-store" },
    );
  },
  searchProducts(input: ProductSearchRequest) {
    return govaApi.get<ProductSearchResult>(
      `/api/search/products?${productQuery(input).toString()}`,
      { cache: "no-store" },
    );
  },
  searchSellers(input: SellerSearchRequest) {
    return govaApi.get<SellerSearchResult>(
      `/api/search/sellers?${sellerQuery(input).toString()}`,
      { cache: "no-store" },
    );
  },
};
