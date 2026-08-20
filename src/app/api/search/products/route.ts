import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { parseProductSearchRequest } from "@/features/product-search/entities/product-search.request";
import { productSearchService } from "@/features/product-search/services/product-search-service.server";

export async function GET(request: Request) {
  try {
    const payload = parseProductSearchRequest(new URL(request.url).searchParams);
    return apiSuccess(await productSearchService.searchProducts(payload));
  } catch (error) {
    return mapServiceError(error);
  }
}
