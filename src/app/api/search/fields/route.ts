import { apiError, apiSuccess } from "@/core/api/api-response";
import { categoryService } from "@/features/categories";
import { getEnabledProductSearchFields } from "@/features/product-search/services/product-search-fields.server";

const SAFE_ID = /^\d+$/;

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const mainCategoryId = q.get("mainCategoryId") ?? "";
  const subcategoryId = q.get("subcategoryId") ?? "";
  if (
    !SAFE_ID.test(mainCategoryId) ||
    !SAFE_ID.test(subcategoryId) ||
    !categoryService.resolveLegacyProductSelection(mainCategoryId, subcategoryId).valid
  ) {
    return apiError("invalidSearchCategory", 400);
  }
  return apiSuccess({
    fields: await getEnabledProductSearchFields(mainCategoryId, subcategoryId),
  });
}
