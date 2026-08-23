import type {
  ProductSearchFilters,
  ProductSearchRequest,
  SellerSearchRequest,
} from "./product-search.types";

/**
 * The wire shape of a search request, parsed in one place.
 *
 * Two deployments answer these routes — the main application and the submain mirror — and both
 * were parsing the query string themselves, field by field. That is a contract, not a detail:
 * the moment one of them defaults `limit` differently or forgets a filter, the same URL returns
 * different results depending on which deployment the bridge happened to reach, and nothing
 * fails to make that visible.
 *
 * Pure and dependency-free, so the mirror can carry it without dragging a service in.
 */
const DEFAULT_LIMIT = 24;

export function parseProductSearchRequest(params: URLSearchParams): ProductSearchRequest {
  return {
    q: params.get("q") ?? "",
    ownerUid: params.get("ownerUid") ?? "",
    mainCategoryId: params.get("mainCategoryId") ?? "",
    subcategoryId: params.get("subcategoryId") ?? "",
    fields: params.get("fields")?.split(",").filter(Boolean) ?? [],
    sort: (params.get("sort") as ProductSearchRequest["sort"]) ?? "newest",
    offset: Number(params.get("offset") || 0),
    limit: Number(params.get("limit") || DEFAULT_LIMIT),
    includeDrafts: params.get("includeDrafts") === "true",
    filters: {
      availableOnly: params.get("availableOnly") === "true",
      needsCar: params.get("needsCar") === "true",
      status: (params.get("status") as ProductSearchFilters["status"]) ?? "",
      minRating: (params.get("minRating") as ProductSearchFilters["minRating"]) ?? "",
    },
  };
}

export function parseSellerSearchRequest(params: URLSearchParams): SellerSearchRequest {
  return {
    q: params.get("q") ?? "",
    mainCategoryId: params.get("mainCategoryId") ?? "",
    subcategoryId: params.get("subcategoryId") ?? "",
    sort: (params.get("sort") as SellerSearchRequest["sort"]) ?? "relevance",
    offset: Number(params.get("offset") || 0),
    limit: Number(params.get("limit") || DEFAULT_LIMIT),
    minRating: (params.get("minRating") as SellerSearchRequest["minRating"]) ?? "",
  };
}

/** Category ids are digits. Anything else is rejected before it reaches a query. */
export const SEARCH_CATEGORY_ID = /^\d+$/;

export function isSearchCategorySelectionShaped(
  mainCategoryId: string,
  subcategoryId: string,
): boolean {
  return SEARCH_CATEGORY_ID.test(mainCategoryId) && SEARCH_CATEGORY_ID.test(subcategoryId);
}
