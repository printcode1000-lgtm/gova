import "server-only";

import { categoryService } from "@/features/categories";
import { profileService } from "@/features/profile/services/profile-service.bootstrap.server";
import type {
  ProductSearchRequest,
  ProductSearchResult,
  SellerSearchRequest,
  SellerSearchResult,
} from "../entities/product-search.types";
import { productSearchRepository } from "../repositories/product-search-repository";
import { getEnabledProductSearchFieldKeys } from "./product-search-fields.server";

const SAFE_ID = /^\d+$/;

function requireCategoryPair(mainCategoryId: string, subcategoryId: string) {
  if (
    !SAFE_ID.test(mainCategoryId) ||
    !SAFE_ID.test(subcategoryId) ||
    !categoryService.resolveLegacyProductSelection(mainCategoryId, subcategoryId).valid
  ) {
    throw new Error("invalidSearchCategory");
  }
}

export class ProductSearchService {
  async searchProducts(
    request: ProductSearchRequest,
  ): Promise<ProductSearchResult> {
    requireCategoryPair(request.mainCategoryId, request.subcategoryId);
    const allowedFieldKeys = await getEnabledProductSearchFieldKeys(
      request.mainCategoryId,
      request.subcategoryId,
    );
    return productSearchRepository.search({ ...request, allowedFieldKeys });
  }

  async searchSellers(request: SellerSearchRequest): Promise<SellerSearchResult> {
    requireCategoryPair(request.mainCategoryId, request.subcategoryId);
    const offset = Math.max(0, request.offset ?? 0);
    const limit = Math.min(60, Math.max(1, request.limit ?? 24));
    const minRating = request.minRating ? Number(request.minRating) : undefined;
    const items = await profileService.getUsersBySpecialty(
      Number(request.mainCategoryId),
      Number(request.subcategoryId),
      offset,
      limit,
      request.q ?? "",
      minRating,
    );
    return {
      items,
      total: offset + items.length + (items.length === limit ? 1 : 0),
      offset,
      limit,
    };
  }
}

export const productSearchService = new ProductSearchService();
