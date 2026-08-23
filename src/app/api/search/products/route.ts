import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { parseProductSearchRequest } from "@/features/product-search";
import { productSearchService } from "@/features/product-search/server";

export async function GET(request: Request) {
  try {
    const payload = parseProductSearchRequest(new URL(request.url).searchParams);
    return apiSuccess(await productSearchService.searchProducts(payload));
  } catch (error) {
    return mapServiceError(error);
  }
}
