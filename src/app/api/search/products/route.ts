import { apiError, apiSuccess } from "@/core/api/api-response";
import type { ProductSearchRequest } from "@/features/product-search/entities/product-search.types";
import { productSearchService } from "@/features/product-search/services/product-search-service.server";

export async function GET(request: Request) {
  try {
    const q = new URL(request.url).searchParams;
    const fields = q.get("fields")?.split(",").filter(Boolean) ?? [];
    const payload: ProductSearchRequest = {
      q: q.get("q") ?? "",
      ownerUid: q.get("ownerUid") ?? "",
      mainCategoryId: q.get("mainCategoryId") ?? "",
      subcategoryId: q.get("subcategoryId") ?? "",
      fields,
      sort: (q.get("sort") as ProductSearchRequest["sort"]) ?? "newest",
      offset: Number(q.get("offset") || 0),
      limit: Number(q.get("limit") || 24),
      includeDrafts: q.get("includeDrafts") === "true",
      filters: {
        availableOnly: q.get("availableOnly") === "true",
        needsCar: q.get("needsCar") === "true",
        status: (q.get("status") as any) ?? "",
        minRating: (q.get("minRating") as any) ?? "",
      },
    };
    return apiSuccess(await productSearchService.searchProducts(payload));
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "searchFailed", 400);
  }
}
