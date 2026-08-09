import { z } from "zod";

const identifier = z.string().min(1).regex(/^[a-z0-9][A-Za-z0-9_-]*$/);
const relativeJsonPath = z
  .string()
  .min(1)
  .regex(/^(?!.*(?:^|\/)\.\.(?:\/|$))[a-z0-9][a-z0-9_./-]*\.json$/);
const assetFileName = z.string().min(1).regex(/^(?!.*\.\.)[^/\\]+$/);
const publicAssetPath = z.string().min(1).regex(/^\/(?!.*\.\.)[A-Za-z0-9_./%&+() -]+$/);
const localizedTextSchema = z
  .object({ ar: z.string().min(1), en: z.string().min(1) })
  .catchall(z.string());
const auditTimestampsSchema = z.object({
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const catalogDisplaySchema = z.object({
  order: z.number().int().positive(),
  hidden: z.boolean(),
});

export const catalogCategorySchema = auditTimestampsSchema.extend({
  id: z.number().int().positive(),
  name: localizedTextSchema,
  icon: z.string(),
  image: assetFileName,
  display: catalogDisplaySchema,
});

export const catalogCollectionSchema = z.object({
  id: z.number().int().nonnegative(),
  name: localizedTextSchema,
  image: assetFileName,
  memberCategoryIds: z.array(z.number().int().positive()).min(1),
  display: catalogDisplaySchema,
});

export const catalogSubcategorySchema = auditTimestampsSchema.extend({
  id: z.number().int().positive(),
  categoryId: z.number().int().positive(),
  originalId: z.number().int().positive(),
  name: localizedTextSchema,
  icon: z.string(),
  image: assetFileName,
  groupKey: identifier.nullable(),
  display: catalogDisplaySchema,
});

export const specialtyColumnMappingSchema = z.object({
  key: z.string().min(1),
  kind: z.enum([
    "subcategory",
    "doctor-specialty",
    "collection-member",
    "direct-category",
  ]),
  mainId: z.number().int().nonnegative(),
  childId: z.number().int().positive().nullable(),
  column: z.string().regex(/^[a-z][a-z0-9_]*$/),
});

export const pharmacyCategorySchema = auditTimestampsSchema.extend({
  id: z.number().int().positive(),
  name: localizedTextSchema,
  icon: z.string(),
  display: catalogDisplaySchema,
});

export const pharmacySubcategorySchema = auditTimestampsSchema.extend({
  id: z.number().int().positive(),
  categoryId: z.number().int().positive(),
  originalId: z.number().int().positive(),
  name: localizedTextSchema,
  display: catalogDisplaySchema,
});

export const pharmacyIngredientSchema = auditTimestampsSchema.extend({
  id: z.number().int().positive(),
  subcategoryId: z.number().int().positive(),
  originalId: z.number().int().positive(),
  name: localizedTextSchema,
  imagePath: publicAssetPath,
  prescriptionRequired: z.boolean(),
  formIds: z.array(identifier),
  strengthIds: z.array(identifier),
  display: catalogDisplaySchema,
});

export const pharmacyFormSchema = auditTimestampsSchema.extend({
  id: identifier,
  name: localizedTextSchema,
  display: catalogDisplaySchema,
});

export const pharmacyStrengthSchema = auditTimestampsSchema.extend({
  id: identifier,
  value: z.string().min(1),
  display: catalogDisplaySchema,
});

export const vehicleGroupSchema = z.object({
  key: identifier,
  name: localizedTextSchema,
  optionFile: relativeJsonPath,
  supportsImage: z.boolean(),
  display: catalogDisplaySchema,
});

export const vehicleOptionSchema = z.object({
  id: identifier,
  name: localizedTextSchema,
  image: assetFileName.nullable(),
  isDefault: z.boolean(),
  display: catalogDisplaySchema,
});

function versionedItems<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    schemaVersion: z.literal(3),
    items: z.array(itemSchema),
  });
}

export const categoryCatalogFileSchema = versionedItems(catalogCategorySchema);
export const collectionCatalogFileSchema = versionedItems(catalogCollectionSchema);
export const subcategoryCatalogFileSchema = versionedItems(catalogSubcategorySchema);
export const specialtyColumnCatalogFileSchema = z.object({
  schemaVersion: z.literal(3),
  database: z.literal("profile-core"),
  table: z.literal("user_specialties"),
  mappings: z.array(specialtyColumnMappingSchema),
});
export const pharmacyCategoryCatalogFileSchema = versionedItems(pharmacyCategorySchema);
export const pharmacySubcategoryCatalogFileSchema = versionedItems(pharmacySubcategorySchema);
export const pharmacyIngredientCatalogFileSchema = versionedItems(pharmacyIngredientSchema);
export const pharmacyFormCatalogFileSchema = versionedItems(pharmacyFormSchema);
export const pharmacyStrengthCatalogFileSchema = versionedItems(pharmacyStrengthSchema);
export const vehicleGroupCatalogFileSchema = versionedItems(vehicleGroupSchema);
export const vehicleOptionCatalogFileSchema = versionedItems(vehicleOptionSchema);

export const catalogManifestSchema = z.object({
  schemaVersion: z.literal(3),
  catalogVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  datasets: z.object({
    core: z.object({
      categories: relativeJsonPath,
      subcategories: relativeJsonPath,
      collections: relativeJsonPath,
      specialtyColumns: relativeJsonPath,
    }),
    pharmacy: z.object({
      categories: relativeJsonPath,
      subcategories: relativeJsonPath,
      ingredients: relativeJsonPath,
      forms: relativeJsonPath,
      strengths: relativeJsonPath,
    }),
    vehicles: z.object({ groups: relativeJsonPath }),
  }),
  assets: z.object({
    mainCategories: publicAssetPath,
    subcategories: publicAssetPath,
    pharmacy: publicAssetPath,
    vehicles: publicAssetPath,
  }),
});

export const catalogJsonSchemaSources = {
  "manifest.schema.json": catalogManifestSchema,
  "category.schema.json": categoryCatalogFileSchema,
  "collection.schema.json": collectionCatalogFileSchema,
  "subcategory.schema.json": subcategoryCatalogFileSchema,
  "specialty-column.schema.json": specialtyColumnCatalogFileSchema,
  "pharmacy-category.schema.json": pharmacyCategoryCatalogFileSchema,
  "pharmacy-subcategory.schema.json": pharmacySubcategoryCatalogFileSchema,
  "pharmacy-ingredient.schema.json": pharmacyIngredientCatalogFileSchema,
  "pharmacy-form.schema.json": pharmacyFormCatalogFileSchema,
  "pharmacy-strength.schema.json": pharmacyStrengthCatalogFileSchema,
  "vehicle-group.schema.json": vehicleGroupCatalogFileSchema,
  "vehicle-option.schema.json": vehicleOptionCatalogFileSchema,
} as const;
