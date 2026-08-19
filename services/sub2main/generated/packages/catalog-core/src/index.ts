export type {
  LocalizedText,
  AuditTimestamps,
  CatalogDisplay,
  CatalogCategory,
  CatalogCollection,
  CatalogSubcategory,
  SpecialtyMappingKind,
  SpecialtyColumnMapping,
  PharmacyCatalogCategoryV3,
  PharmacyCatalogSubcategoryV3,
  PharmacyCatalogIngredientV3,
  PharmacyCatalogFormV3,
  PharmacyCatalogStrengthV3,
  VehicleCatalogGroup,
  VehicleCatalogOption,
  CatalogManifest,
} from './domain/catalog-v3.types';

export {
  catalogManifestSchema,
  catalogDisplaySchema,
  catalogCategorySchema,
  catalogCollectionSchema,
  catalogSubcategorySchema,
  specialtyColumnMappingSchema,
  pharmacyCategorySchema,
  pharmacySubcategorySchema,
  pharmacyIngredientSchema,
  pharmacyFormSchema,
  pharmacyStrengthSchema,
  vehicleGroupSchema,
  vehicleOptionSchema,
  categoryCatalogFileSchema,
  collectionCatalogFileSchema,
  subcategoryCatalogFileSchema,
  specialtyColumnCatalogFileSchema,
  pharmacyCategoryCatalogFileSchema,
  pharmacySubcategoryCatalogFileSchema,
  pharmacyIngredientCatalogFileSchema,
  pharmacyFormCatalogFileSchema,
  pharmacyStrengthCatalogFileSchema,
  vehicleGroupCatalogFileSchema,
  vehicleOptionCatalogFileSchema,
  catalogJsonSchemaSources,
} from './validation/catalog-v3.contract';

export { isCatalogItemVisible, visibleCatalogItems } from './validation/catalog-display';

export const CATALOG_V3_SCHEMA_VERSION = 3 as const;

export const DEFAULT_CATALOG_DIRECTORY_NAME = 'catagory' as const;
