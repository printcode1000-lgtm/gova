import "server-only";

import { registerPharmacyProductLookupPort } from "@/features/product/server";
import { pharmacyProfileCatalogService } from "./services/pharmacy-profile-catalog.service.server";

/**
 * Bind the pharmacy catalog as the product-service lookup adapter.
 *
 * `productService.listByOwnerAndCategory` always asks this port, including for
 * non-pharmacy buckets. The main app registers it from instrumentation; the
 * products account has no instrumentation, so its composition root must call
 * this too or every browser GET /api/products answers 500.
 */
export function registerPharmacyCatalogProductLookupPort(): void {
  registerPharmacyProductLookupPort({
    getProduct: (id) => pharmacyProfileCatalogService.getProduct(id),
    isPharmacyProductBucket: (mainCategoryId, subcategoryId) =>
      pharmacyProfileCatalogService.isPharmacyProductBucket(
        mainCategoryId,
        subcategoryId,
      ),
    listProducts: (uid) => pharmacyProfileCatalogService.listProducts(uid),
    updateFixedProduct: (id, uid, details) =>
      pharmacyProfileCatalogService.updateFixedProduct(id, uid, details),
    hideFixedProduct: (id, uid) =>
      pharmacyProfileCatalogService.hideFixedProduct(id, uid),
  });
}
