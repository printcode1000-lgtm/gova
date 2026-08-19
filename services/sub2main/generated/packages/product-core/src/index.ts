export type {
  ProductImage,
  ProductStatus,
  ProductRatingMode,
  ProductMainData,
  ProductPriceData,
  ProductSpecificationsData,
  ProductVehicleSpecsData,
  ProductPropertySpecsData,
  ProductPharmacyCatalogData,
  ProductPharmacySpecsData,
  ProductRatingData,
  ProductDetails,
  ProductRecord,
  CreateProductInput,
  UpdateProductInput,
} from "./domain/product.entity";
export {
  createEmptyProductDetails,
  toProductDetails,
} from "./domain/product.entity";
export { isSafeProductId, normalizeProductStatus } from "./domain/ids";
export {
  normalizeProductDetails,
  normalizeRatingMode,
} from "./domain/normalize";
