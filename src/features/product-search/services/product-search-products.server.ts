import "server-only";

import { categoryService } from "@/features/categories";
import type {
  ProductSearchRequest,
  ProductSearchResult,
} from "../entities/product-search.types";
import { productSearchRepository } from "@/modules/data-access/domains/product-search/index.server";
import { getEnabledProductSearchFieldKeys } from "./product-search-fields.server";
import { imageStorageService } from "@/features/storage/services/image-storage-service.bootstrap.server";

/**
 * Product search, split out from the seller search that used to sit beside it.
 *
 * The two look related but read different databases: this one touches only the
 * products database, while seller search reads the profile shards and their
 * avatar storage. Keeping them in one module meant importing product search
 * also imported the profile service, its storage orchestrator, and the R2
 * client — a chain the products deployment cannot satisfy and should not need.
 *
 * This file is mirrored into `services/products`; the seller half is not.
 */

const SAFE_ID = /^\d+$/;

export function requireCategoryPair(mainCategoryId: string, subcategoryId: string): void {
  if (
    !SAFE_ID.test(mainCategoryId) ||
    !SAFE_ID.test(subcategoryId) ||
    !categoryService.resolveLegacyProductSelection(mainCategoryId, subcategoryId).valid
  ) {
    throw new Error("invalidSearchCategory");
  }
}

export async function searchProducts(
  request: ProductSearchRequest,
): Promise<ProductSearchResult> {
  requireCategoryPair(request.mainCategoryId, request.subcategoryId);
  const allowedFieldKeys = await getEnabledProductSearchFieldKeys(
    request.mainCategoryId,
    request.subcategoryId,
  );
  const result = await productSearchRepository.search({ ...request, allowedFieldKeys });
  return {
    ...result,
    items: result.items.map((product) => ({
      ...product,
      images: product.images.map((image) => ({
        ...image,
        url: imageStorageService.resolveImageUrl(
          "product-default",
          image.imageKey,
        ),
      })),
    })),
  };
}
