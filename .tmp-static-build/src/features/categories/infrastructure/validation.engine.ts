import fs from "node:fs";
import path from "node:path";

import { CATEGORY_CONSTANTS } from "../domain/constants/category-constants";
import {
  loadCatalogManifest,
  loadCategories,
  loadCollections,
  loadSpecialtyColumnMappings,
  loadSubcategories,
} from "./catalog-data.loader";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalCategories: number;
    totalSubcategories: number;
    totalCollections: number;
    orphanedSubcategories: number;
    duplicateIds: number;
    missingFields: number;
  };
}

function publicAssetPath(publicUrlRoot: string, fileName: string) {
  return path.join(process.cwd(), "public", publicUrlRoot.replace(/^\/+/, ""), fileName);
}

function duplicateOrders(items: readonly { display: { order: number } }[]): number[] {
  const orders = items.map((item) => item.display.order);
  return [...new Set(orders.filter((order, index) => orders.indexOf(order) !== index))];
}

export class ValidationEngine {
  validate(): ValidationResult {
    const categories = loadCategories();
    const collections = loadCollections();
    const subcategories = loadSubcategories();
    const specialtyMappings = loadSpecialtyColumnMappings();
    const manifest = loadCatalogManifest();
    const errors: string[] = [];
    const warnings: string[] = [];
    let missingFields = 0;
    let duplicateIds = 0;
    let orphanedSubcategories = 0;

    const categoryIds = new Set<number>();
    for (const category of categories) {
      if (categoryIds.has(category.id)) {
        errors.push(`Duplicate category ID ${category.id}`);
        duplicateIds++;
      }
      categoryIds.add(category.id);
      for (const [field, value] of [
        ["titleAr", category.titleAr],
        ["titleEn", category.titleEn],
        ["image", category.image],
      ] as const) {
        if (!value.trim()) {
          errors.push(`Category ${category.id} has an empty ${field}`);
          missingFields++;
        }
      }
      const imagePath = publicAssetPath(manifest.assets.mainCategories, category.image);
      if (!fs.existsSync(imagePath)) warnings.push(`Category ${category.id} image is missing: ${imagePath}`);
    }

    const subcategoryIds = new Set<number>();
    const originalIdsByCategory = new Map<number, Set<number>>();
    for (const subcategory of subcategories) {
      if (subcategoryIds.has(subcategory.id)) {
        errors.push(`Duplicate subcategory ID ${subcategory.id}`);
        duplicateIds++;
      }
      subcategoryIds.add(subcategory.id);
      if (!categoryIds.has(subcategory.categoryId)) {
        errors.push(
          `Subcategory ${subcategory.id} references missing category ${subcategory.categoryId}`,
        );
        orphanedSubcategories++;
      }
      const originalIds = originalIdsByCategory.get(subcategory.categoryId) ?? new Set<number>();
      if (originalIds.has(subcategory.originalId)) {
        errors.push(
          `Duplicate originalId ${subcategory.originalId} in category ${subcategory.categoryId}`,
        );
      }
      originalIds.add(subcategory.originalId);
      originalIdsByCategory.set(subcategory.categoryId, originalIds);
      if (
        subcategory.groupKey === "doctor-appointment" &&
        subcategory.categoryId !== CATEGORY_CONSTANTS.MEDICAL_SERVICES_ID
      ) {
        errors.push(
          `Doctor specialty ${subcategory.id} is outside Medical Services category`,
        );
      }
      const imagePath = publicAssetPath(manifest.assets.subcategories, subcategory.image);
      if (!fs.existsSync(imagePath)) {
        warnings.push(`Subcategory ${subcategory.id} image is missing: ${imagePath}`);
      }
    }

    const collectionIds = new Set<number>();
    const collectionMemberIds = new Set<number>();
    for (const collection of collections) {
      if (collectionIds.has(collection.id)) {
        errors.push(`Duplicate collection ID ${collection.id}`);
        duplicateIds++;
      }
      collectionIds.add(collection.id);
      if (!collection.nameAr.trim() || !collection.nameEn.trim() || !collection.image.trim()) {
        errors.push(`Collection ${collection.id} has missing display metadata`);
        missingFields++;
      }
      for (const memberId of collection.memberCategoryIds) {
        if (!categoryIds.has(memberId)) {
          errors.push(`Collection ${collection.id} references missing category ${memberId}`);
        }
        if (collectionMemberIds.has(memberId)) {
          errors.push(`Category ${memberId} belongs to more than one collection`);
        }
        collectionMemberIds.add(memberId);
      }
      const imagePath = publicAssetPath(manifest.assets.mainCategories, collection.image);
      if (!fs.existsSync(imagePath)) warnings.push(`Collection ${collection.id} image is missing: ${imagePath}`);
    }

    const mainOrderDuplicates = duplicateOrders([
      ...categories.filter((item) => !collectionMemberIds.has(item.id)),
      ...collections,
    ]);
    if (mainOrderDuplicates.length) {
      errors.push(`Duplicate home display orders: ${mainOrderDuplicates.join(", ")}`);
      duplicateIds += mainOrderDuplicates.length;
    }
    for (const categoryId of categoryIds) {
      const duplicates = duplicateOrders(
        subcategories.filter((item) => item.categoryId === categoryId),
      );
      if (duplicates.length) {
        errors.push(
          `Duplicate subcategory display orders under category ${categoryId}: ${duplicates.join(", ")}`,
        );
        duplicateIds += duplicates.length;
      }
    }
    for (const collection of collections) {
      const members = collection.memberCategoryIds
        .map((memberId) => categories.find((item) => item.id === memberId))
        .filter((item): item is (typeof categories)[number] => Boolean(item));
      const duplicates = duplicateOrders(members);
      if (duplicates.length) {
        errors.push(
          `Duplicate collection member display orders under collection ${collection.id}: ${duplicates.join(", ")}`,
        );
        duplicateIds += duplicates.length;
      }
    }

    for (const requiredId of [
      CATEGORY_CONSTANTS.MEDICAL_SERVICES_ID,
      CATEGORY_CONSTANTS.DELIVERY_SERVICES_ID,
    ]) {
      if (!categoryIds.has(requiredId)) errors.push(`Required category ${requiredId} is missing`);
    }

    const expectedMappingKeys = new Set([
      ...subcategories
        .filter((item) => item.categoryId !== CATEGORY_CONSTANTS.DELIVERY_SERVICES_ID)
        .map((item) =>
          `${item.groupKey === "doctor-appointment" ? "doctor-specialty" : "subcategory"}:${item.categoryId}:${item.originalId}`,
        ),
      ...collections.flatMap((collection) =>
        collection.memberCategoryIds.map(
          (memberId) => `collection-member:${collection.id}:${memberId}`,
        ),
      ),
      `direct-category:${CATEGORY_CONSTANTS.DELIVERY_SERVICES_ID}`,
    ]);
    const mappingKeys = new Set<string>();
    for (const mapping of specialtyMappings) {
      if (mappingKeys.has(mapping.key)) {
        errors.push(`Duplicate specialty mapping key ${mapping.key}`);
        duplicateIds++;
      }
      mappingKeys.add(mapping.key);
      if (!mapping.column.trim()) errors.push(`Specialty mapping ${mapping.key} has no column`);
    }
    for (const key of expectedMappingKeys) {
      if (!mappingKeys.has(key)) errors.push(`Missing specialty mapping ${key}`);
    }
    for (const key of mappingKeys) {
      if (!expectedMappingKeys.has(key)) errors.push(`Unknown specialty mapping ${key}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      stats: {
        totalCategories: categories.length,
        totalSubcategories: subcategories.length,
        totalCollections: collections.length,
        orphanedSubcategories,
        duplicateIds,
        missingFields,
      },
    };
  }
}

export const validationEngine = new ValidationEngine();
