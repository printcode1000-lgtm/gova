import { apiError, apiSuccess, mapServiceError } from "@/core/api/api-response";
import { categoryService } from "@/features/categories";
import { isSearchCategorySelectionShaped } from "@/features/product-search/entities/product-search.request";
import { getEnabledProductSearchFields } from "@/features/product-search/services/product-search-fields.server";

export async function GET(request: Request) {
  try {
    const q = new URL(request.url).searchParams;
    const mainCategoryId = q.get("mainCategoryId") ?? "";
    const subcategoryId = q.get("subcategoryId") ?? "";
    if (
      !isSearchCategorySelectionShaped(mainCategoryId, subcategoryId) ||
      !categoryService.resolveProductSelection(mainCategoryId, subcategoryId).valid
    ) {
      return apiError("invalidSearchCategory", 400);
    }
    return apiSuccess({
      fields: await getEnabledProductSearchFields(mainCategoryId, subcategoryId),
    });
  } catch (error) {
    return mapServiceError(error);
  }
}
