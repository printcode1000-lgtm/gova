import "server-only";

import { profileService } from "@/features/profile/server";
import type {
  ProductSearchRequest,
  ProductSearchResult,
  SellerSearchRequest,
  SellerSearchResult,
} from "../../domain/product-search.types";
import {
  requireCategoryPair,
  searchProducts,
} from "./product-search-products.server";

/**
 * The main app's search entry point.
 *
 * Product search is delegated to `product-search-products.server.ts`, which
 * carries no profile dependency and is the module the products deployment
 * mirrors. Seller search stays here because it reads the profile shards and
 * their avatar storage — neither of which the products account holds.
 */
export class ProductSearchService {
  async searchProducts(
    request: ProductSearchRequest,
  ): Promise<ProductSearchResult> {
    return searchProducts(request);
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
