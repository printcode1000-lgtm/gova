import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { parseSellerSearchRequest } from "@/features/product-search/entities/product-search.request";
import { productSearchService } from "@/features/product-search/services/product-search-service.server";

export async function GET(request: Request) {
  try {
    const payload = parseSellerSearchRequest(new URL(request.url).searchParams);
    return apiSuccess(await productSearchService.searchSellers(payload));
  } catch (error) {
    return mapServiceError(error);
  }
}
