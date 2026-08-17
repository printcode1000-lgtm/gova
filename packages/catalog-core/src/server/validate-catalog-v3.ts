import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

import {
  catalogJsonSchemaSources,
  catalogManifestSchema,
  categoryCatalogFileSchema,
  collectionCatalogFileSchema,
  pharmacyCategoryCatalogFileSchema,
  pharmacyFormCatalogFileSchema,
  pharmacyIngredientCatalogFileSchema,
  pharmacyStrengthCatalogFileSchema,
  pharmacySubcategoryCatalogFileSchema,
  specialtyColumnCatalogFileSchema,
  subcategoryCatalogFileSchema,
  vehicleGroupCatalogFileSchema,
  vehicleOptionCatalogFileSchema,
} from '../validation/catalog-v3.contract';

export interface ValidateCatalogV3Options {
  catalogRoot: string;
  publicRoot: string;
  expectedDatabaseColumns?: ReadonlySet<string>;
}

export interface ValidateCatalogV3Summary {
  schemaVersion: number;
  catalogVersion: string;
  categories: number;
  subcategories: number;
  collections: number;
  specialtyMappings: number;
  specialtyColumns: number;
  pharmacyCategories: number;
  pharmacySubcategories: number;
  pharmacyIngredients: number;
  pharmacyForms: number;
  pharmacyStrengths: number;
  vehicleGroups: number;
  vehicleOptions: number;
}

export interface ValidateCatalogV3Result {
  errors: string[];
  warnings: string[];
  summary: ValidateCatalogV3Summary | null;
}

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

type Displayable = { display: { order: number; hidden: boolean } };

export function validateCatalogV3(options: ValidateCatalogV3Options): ValidateCatalogV3Result {
  const { catalogRoot, publicRoot, expectedDatabaseColumns } = options;
  const errors: string[] = [];
  const warnings: string[] = [];

  function catalogFile(relativePath: string): string {
    const resolved = path.resolve(catalogRoot, relativePath);
    if (!resolved.startsWith(`${catalogRoot}${path.sep}`)) {
      throw new Error(`Catalog path escapes root: ${relativePath}`);
    }
    if (!fs.existsSync(resolved)) throw new Error(`Catalog file is missing: ${relativePath}`);
    return resolved;
  }

  function publicAsset(publicUrlRoot: string, fileName: string): string {
    return path.join(publicRoot, publicUrlRoot.replace(/^\/+/, ''), fileName);
  }

  function requireUnique(values: Array<string | number>, label: string): void {
    const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
    if (duplicates.length) errors.push(`${label} duplicates: ${[...new Set(duplicates)].join(', ')}`);
  }

  function requireAsset(assetPath: string, label: string): void {
    if (!fs.existsSync(assetPath)) errors.push(`${label} is missing: ${assetPath}`);
  }

  function requireUniqueDisplayOrders<T extends Displayable>(items: readonly T[], label: string): void {
    requireUnique(items.map((item) => item.display.order), `${label} display orders`);
  }

  function requireSiblingDisplayOrders<T extends Displayable>(
    items: readonly T[],
    parentKey: (item: T) => string | number,
    label: string,
  ): void {
    const groups = new Map<string | number, T[]>();
    for (const item of items) {
      const key = parentKey(item);
      const siblings = groups.get(key) ?? [];
      siblings.push(item);
      groups.set(key, siblings);
    }
    for (const [key, siblings] of groups) {
      requireUniqueDisplayOrders(siblings, `${label} under ${key}`);
    }
  }

  try {
    const manifest = catalogManifestSchema.parse(readJson(path.join(catalogRoot, 'manifest.json')));
    const categories = categoryCatalogFileSchema.parse(
      readJson(catalogFile(manifest.datasets.core.categories)),
    ).items;
    const collections = collectionCatalogFileSchema.parse(
      readJson(catalogFile(manifest.datasets.core.collections)),
    ).items;
    const subcategories = subcategoryCatalogFileSchema.parse(
      readJson(catalogFile(manifest.datasets.core.subcategories)),
    ).items;
    const specialtyColumns = specialtyColumnCatalogFileSchema.parse(
      readJson(catalogFile(manifest.datasets.core.specialtyColumns)),
    );
    const pharmacyCategories = pharmacyCategoryCatalogFileSchema.parse(
      readJson(catalogFile(manifest.datasets.pharmacy.categories)),
    ).items;
    const pharmacySubcategories = pharmacySubcategoryCatalogFileSchema.parse(
      readJson(catalogFile(manifest.datasets.pharmacy.subcategories)),
    ).items;
    const pharmacyIngredients = pharmacyIngredientCatalogFileSchema.parse(
      readJson(catalogFile(manifest.datasets.pharmacy.ingredients)),
    ).items;
    const pharmacyForms = pharmacyFormCatalogFileSchema.parse(
      readJson(catalogFile(manifest.datasets.pharmacy.forms)),
    ).items;
    const pharmacyStrengths = pharmacyStrengthCatalogFileSchema.parse(
      readJson(catalogFile(manifest.datasets.pharmacy.strengths)),
    ).items;
    const vehicleGroups = vehicleGroupCatalogFileSchema.parse(
      readJson(catalogFile(manifest.datasets.vehicles.groups)),
    ).items;

    requireUnique(categories.map((item) => item.id), 'Category IDs');
    requireUnique(collections.map((item) => item.id), 'Collection IDs');
    requireUnique(subcategories.map((item) => item.id), 'Subcategory IDs');
    requireUnique(
      subcategories.map((item) => `${item.categoryId}:${item.originalId}`),
      'Subcategory parent/original IDs',
    );
    requireUnique(specialtyColumns.mappings.map((item) => item.key), 'Specialty mapping keys');
    requireUnique(pharmacyCategories.map((item) => item.id), 'Pharmacy category IDs');
    requireUnique(pharmacySubcategories.map((item) => item.id), 'Pharmacy subcategory IDs');
    requireUnique(pharmacyIngredients.map((item) => item.id), 'Pharmacy ingredient IDs');
    requireUnique(pharmacyIngredients.map((item) => item.originalId), 'Pharmacy ingredient original IDs');
    requireUnique(pharmacyForms.map((item) => item.id), 'Pharmacy form IDs');
    requireUnique(pharmacyStrengths.map((item) => item.id), 'Pharmacy strength IDs');
    requireUnique(vehicleGroups.map((item) => item.key), 'Vehicle group keys');
    requireUnique(vehicleGroups.map((item) => item.optionFile), 'Vehicle option files');

    const categoryIds = new Set(categories.map((item) => item.id));
    const collectionMemberIds = collections.flatMap((item) => item.memberCategoryIds);
    requireUnique(collectionMemberIds, 'Collection member IDs');
    const collectionMemberIdSet = new Set(collectionMemberIds);
    requireUniqueDisplayOrders(
      [
        ...categories.filter((item) => !collectionMemberIdSet.has(item.id)),
        ...collections,
      ],
      'Home catalog items',
    );
    requireSiblingDisplayOrders(subcategories, (item) => item.categoryId, 'Subcategories');
    requireUniqueDisplayOrders(pharmacyCategories, 'Pharmacy categories');
    requireSiblingDisplayOrders(
      pharmacySubcategories,
      (item) => item.categoryId,
      'Pharmacy subcategories',
    );
    requireSiblingDisplayOrders(
      pharmacyIngredients,
      (item) => item.subcategoryId,
      'Pharmacy ingredients',
    );
    requireUniqueDisplayOrders(pharmacyForms, 'Pharmacy forms');
    requireUniqueDisplayOrders(pharmacyStrengths, 'Pharmacy strengths');
    requireUniqueDisplayOrders(vehicleGroups, 'Vehicle groups');

    for (const collection of collections) {
      const members = collection.memberCategoryIds
        .map((memberId) => categories.find((item) => item.id === memberId))
        .filter((item): item is (typeof categories)[number] => Boolean(item));
      requireUniqueDisplayOrders(members, `Collection ${collection.id} members`);
      if (!collection.display.hidden && !members.some((item) => !item.display.hidden)) {
        errors.push(`Visible collection ${collection.id} has no visible members`);
      }
      for (const memberId of collection.memberCategoryIds) {
        if (!categoryIds.has(memberId)) {
          errors.push(`Collection ${collection.id} references missing category ${memberId}`);
        }
      }
      requireAsset(
        publicAsset(manifest.assets.mainCategories, collection.image),
        `Collection ${collection.id} image`,
      );
    }

    for (const category of categories) {
      requireAsset(
        publicAsset(manifest.assets.mainCategories, category.image),
        `Category ${category.id} image`,
      );
    }

    for (const subcategory of subcategories) {
      if (!categoryIds.has(subcategory.categoryId)) {
        errors.push(`Subcategory ${subcategory.id} has missing category ${subcategory.categoryId}`);
      }
      if (subcategory.groupKey && subcategory.groupKey !== 'doctor-appointment') {
        warnings.push(`Unknown subcategory group ${subcategory.groupKey} on ${subcategory.id}`);
      }
      if (subcategory.groupKey === 'doctor-appointment' && subcategory.categoryId !== 20) {
        errors.push(`Doctor specialty ${subcategory.id} must belong to category 20`);
      }
      requireAsset(
        publicAsset(manifest.assets.subcategories, subcategory.image),
        `Subcategory ${subcategory.id} image`,
      );
    }

    const expectedSpecialtyKeys = new Set([
      ...subcategories
        .filter((item) => item.categoryId !== 46)
        .map(
          (item) =>
            `${item.groupKey === 'doctor-appointment' ? 'doctor-specialty' : 'subcategory'}:${item.categoryId}:${item.originalId}`,
        ),
      ...collections.flatMap((collection) =>
        collection.memberCategoryIds.map(
          (memberId) => `collection-member:${collection.id}:${memberId}`,
        ),
      ),
      'direct-category:46',
    ]);
    const actualSpecialtyKeys = new Set(specialtyColumns.mappings.map((item) => item.key));
    requireUnique(
      specialtyColumns.mappings.map((item) => `${item.mainId}:${item.childId ?? item.mainId}`),
      'Specialty selection mappings',
    );
    for (const mapping of specialtyColumns.mappings) {
      const expectedKey =
        mapping.kind === 'direct-category'
          ? `direct-category:${mapping.mainId}`
          : `${mapping.kind}:${mapping.mainId}:${mapping.childId}`;
      if (mapping.key !== expectedKey) {
        errors.push(`Specialty mapping key mismatch: ${mapping.key} should be ${expectedKey}`);
      }
    }
    for (const key of expectedSpecialtyKeys) {
      if (!actualSpecialtyKeys.has(key)) errors.push(`Missing specialty mapping ${key}`);
    }
    for (const key of actualSpecialtyKeys) {
      if (!expectedSpecialtyKeys.has(key)) errors.push(`Unknown specialty mapping ${key}`);
    }

    const mappedColumns = new Set(specialtyColumns.mappings.map((item) => item.column));
    if (expectedDatabaseColumns) {
      for (const column of mappedColumns) {
        if (!expectedDatabaseColumns.has(column)) {
          errors.push(`Mapped specialty column is missing: ${column}`);
        }
      }
      for (const column of expectedDatabaseColumns) {
        if (!mappedColumns.has(column)) errors.push(`Unmapped user_specialties column: ${column}`);
      }
    }

    const pharmacyCategoryIds = new Set(pharmacyCategories.map((item) => item.id));
    const pharmacySubcategoryIds = new Set(pharmacySubcategories.map((item) => item.id));
    const pharmacyFormIds = new Set(pharmacyForms.map((item) => item.id));
    const pharmacyStrengthIds = new Set(pharmacyStrengths.map((item) => item.id));
    const referencedPharmacyImages = new Set<string>();

    for (const subcategory of pharmacySubcategories) {
      if (!pharmacyCategoryIds.has(subcategory.categoryId)) {
        errors.push(
          `Pharmacy subcategory ${subcategory.id} has missing category ${subcategory.categoryId}`,
        );
      }
    }

    for (const ingredient of pharmacyIngredients) {
      if (!pharmacySubcategoryIds.has(ingredient.subcategoryId)) {
        errors.push(
          `Pharmacy ingredient ${ingredient.id} has missing subcategory ${ingredient.subcategoryId}`,
        );
      }
      requireUnique(ingredient.formIds, `Ingredient ${ingredient.id} form IDs`);
      requireUnique(ingredient.strengthIds, `Ingredient ${ingredient.id} strength IDs`);
      for (const formId of ingredient.formIds) {
        if (!pharmacyFormIds.has(formId)) {
          errors.push(`Ingredient ${ingredient.id} references missing form ${formId}`);
        }
      }
      for (const strengthId of ingredient.strengthIds) {
        if (!pharmacyStrengthIds.has(strengthId)) {
          errors.push(`Ingredient ${ingredient.id} references missing strength ${strengthId}`);
        }
      }
      if (!ingredient.imagePath.startsWith(`${manifest.assets.pharmacy}/`)) {
        errors.push(`Ingredient ${ingredient.id} image is outside the pharmacy asset root`);
      }
      referencedPharmacyImages.add(path.basename(ingredient.imagePath));
      requireAsset(
        path.join(publicRoot, ingredient.imagePath.replace(/^\/+/, '')),
        `Ingredient ${ingredient.id} image`,
      );
    }

    const pharmacyImageDirectory = path.join(
      publicRoot,
      manifest.assets.pharmacy.replace(/^\/+/, ''),
    );
    const actualPharmacyImages = new Set(
      fs.readdirSync(pharmacyImageDirectory, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name),
    );
    for (const image of actualPharmacyImages) {
      if (!referencedPharmacyImages.has(image)) errors.push(`Unreferenced pharmacy image: ${image}`);
    }

    let vehicleOptionCount = 0;
    const referencedVehicleImages = new Set<string>();
    for (const group of vehicleGroups) {
      const optionFile = vehicleOptionCatalogFileSchema.parse(readJson(catalogFile(group.optionFile)));
      vehicleOptionCount += optionFile.items.length;
      requireUnique(optionFile.items.map((item) => item.id), `Vehicle ${group.key} option IDs`);
      requireUniqueDisplayOrders(optionFile.items, `Vehicle ${group.key} options`);
      const defaults = optionFile.items.filter((item) => item.isDefault);
      if (defaults.length > 1) errors.push(`Vehicle group ${group.key} has multiple defaults`);
      if (defaults.some((item) => item.display.hidden)) {
        errors.push(`Vehicle group ${group.key} has a hidden default option`);
      }
      for (const option of optionFile.items) {
        if (group.supportsImage && !option.image) {
          errors.push(`Vehicle option ${group.key}:${option.id} requires an image`);
        }
        if (option.image) {
          referencedVehicleImages.add(option.image);
          requireAsset(
            publicAsset(manifest.assets.vehicles, option.image),
            `Vehicle option ${group.key}:${option.id} image`,
          );
        }
      }
    }

    const vehicleImageDirectory = path.join(
      publicRoot,
      manifest.assets.vehicles.replace(/^\/+/, ''),
    );
    const actualVehicleImages = new Set(
      fs.readdirSync(vehicleImageDirectory, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name),
    );
    for (const image of actualVehicleImages) {
      if (!referencedVehicleImages.has(image)) errors.push(`Unreferenced vehicle image: ${image}`);
    }

    for (const [schemaName, schemaSource] of Object.entries(catalogJsonSchemaSources)) {
      const schema = readJson(catalogFile(`schemas/${schemaName}`));
      try {
        assert.deepEqual(schema, z.toJSONSchema(schemaSource));
      } catch {
        errors.push(`Generated JSON Schema is stale: ${schemaName}`);
      }
    }

    const summary: ValidateCatalogV3Summary = {
      schemaVersion: manifest.schemaVersion,
      catalogVersion: manifest.catalogVersion,
      categories: categories.length,
      subcategories: subcategories.length,
      collections: collections.length,
      specialtyMappings: specialtyColumns.mappings.length,
      specialtyColumns: mappedColumns.size,
      pharmacyCategories: pharmacyCategories.length,
      pharmacySubcategories: pharmacySubcategories.length,
      pharmacyIngredients: pharmacyIngredients.length,
      pharmacyForms: pharmacyForms.length,
      pharmacyStrengths: pharmacyStrengths.length,
      vehicleGroups: vehicleGroups.length,
      vehicleOptions: vehicleOptionCount,
    };

    return { errors, warnings, summary };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    return { errors, warnings, summary: null };
  }
}

export function resolveCatalogRoots(workspaceRoot: string): {
  publicRoot: string;
  catalogRoot: string;
} {
  const publicRoot = process.env.ASOL_CATALOG_PUBLIC_ROOT
    ? path.resolve(process.env.ASOL_CATALOG_PUBLIC_ROOT)
    : path.join(workspaceRoot, 'public');
  const catalogRoot = process.env.ASOL_CATALOG_ROOT
    ? path.resolve(process.env.ASOL_CATALOG_ROOT)
    : path.join(publicRoot, 'catagory');
  return { publicRoot, catalogRoot };
}
