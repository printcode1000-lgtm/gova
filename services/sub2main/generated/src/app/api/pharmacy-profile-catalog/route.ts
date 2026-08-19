import { apiError, apiSuccess } from "@/core/api/api-response";
import { pharmacyProfileCatalogService } from "@/features/pharmacy-profile-catalog/services/pharmacy-profile-catalog.service.server";
import type { PharmacyOverrideStatus } from "@/features/pharmacy-profile-catalog/entities/pharmacy-profile-catalog.types";

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 200) : "";
}

function cleanStatus(value: unknown): PharmacyOverrideStatus {
  return value === "hidden" || value === "visible" || value === "custom"
    ? value
    : "visible";
}

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const uid = cleanText(searchParams.get("uid"));
    if (!uid) return apiError("uid is required", 400);
    const includeHidden = searchParams.get("includeHidden") === "true";
    return apiSuccess(await pharmacyProfileCatalogService.getCatalogView(uid, includeHidden));
  } catch (error) {
    return apiError(error instanceof Error ? error.message : String(error), 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const uid = cleanText(body.uid);
    const action = cleanText(body.action);
    if (!uid) return apiError("uid is required", 400);

    if (action === "create_category") {
      const nameAr = cleanText(body.nameAr);
      if (!nameAr) return apiError("nameAr is required", 400);
      await pharmacyProfileCatalogService.createCategory(
        uid,
        nameAr,
        cleanText(body.nameEn) || undefined,
      );
    } else if (action === "update_category") {
      const categoryId = cleanText(body.categoryId);
      const nameAr = cleanText(body.nameAr);
      if (!categoryId || !nameAr) {
        return apiError("categoryId and nameAr are required", 400);
      }
      await pharmacyProfileCatalogService.updateCategory(
        uid,
        categoryId,
        nameAr,
        cleanText(body.nameEn) || undefined,
      );
    } else if (action === "create_subcategory") {
      const parentCategoryId = cleanText(body.parentCategoryId);
      const nameAr = cleanText(body.nameAr);
      if (!parentCategoryId || !nameAr) {
        return apiError("parentCategoryId and nameAr are required", 400);
      }
      await pharmacyProfileCatalogService.createSubcategory(
        uid,
        parentCategoryId,
        nameAr,
        cleanText(body.nameEn) || undefined,
      );
    } else if (action === "update_subcategory") {
      const subcategoryId = cleanText(body.subcategoryId);
      const parentCategoryId = cleanText(body.parentCategoryId);
      const nameAr = cleanText(body.nameAr);
      if (!subcategoryId || !parentCategoryId || !nameAr) {
        return apiError("subcategoryId, parentCategoryId and nameAr are required", 400);
      }
      await pharmacyProfileCatalogService.updateSubcategory(
        uid,
        subcategoryId,
        parentCategoryId,
        nameAr,
        cleanText(body.nameEn) || undefined,
      );
    } else if (action === "set_category_status") {
      const categoryId = cleanText(body.categoryId);
      if (!categoryId) return apiError("categoryId is required", 400);
      await pharmacyProfileCatalogService.setCategoryStatus(
        uid,
        categoryId,
        cleanStatus(body.status),
      );
    } else if (action === "set_subcategory_status") {
      const subcategoryId = cleanText(body.subcategoryId);
      const parentCategoryId = cleanText(body.parentCategoryId);
      if (!subcategoryId || !parentCategoryId) {
        return apiError("subcategoryId and parentCategoryId are required", 400);
      }
      await pharmacyProfileCatalogService.setSubcategoryStatus(
        uid,
        subcategoryId,
        parentCategoryId,
        cleanStatus(body.status),
      );
    } else if (action === "set_product_status") {
      const productId = cleanText(body.productId);
      if (!productId) return apiError("productId is required", 400);
      await pharmacyProfileCatalogService.setProductStatus(
        uid,
        productId,
        cleanStatus(body.status),
      );
    } else {
      return apiError("Unknown action", 400);
    }

    return apiSuccess(await pharmacyProfileCatalogService.getCatalogView(uid, true));
  } catch (error) {
    return apiError(error instanceof Error ? error.message : String(error), 500);
  }
}
