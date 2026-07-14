import { apiError, apiSuccess } from "@/core/api/api-response";
import type { SellerSearchRequest } from "@/features/product-search/entities/product-search.types";
import { productSearchService } from "@/features/product-search/services/product-search-service.server";

export async function GET(request: Request) {
  try {
    const q = new URL(request.url).searchParams;
    const payload: SellerSearchRequest = {
      q: q.get("q") ?? "",
      mainCategoryId: q.get("mainCategoryId") ?? "",
      subcategoryId: q.get("subcategoryId") ?? "",
      sort: (q.get("sort") as SellerSearchRequest["sort"]) ?? "relevance",
      offset: Number(q.get("offset") || 0),
      limit: Number(q.get("limit") || 24),
      minRating: (q.get("minRating") as SellerSearchRequest["minRating"]) ?? "",
    };
    return apiSuccess(await productSearchService.searchSellers(payload));
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "searchFailed", 400);
  }
}
