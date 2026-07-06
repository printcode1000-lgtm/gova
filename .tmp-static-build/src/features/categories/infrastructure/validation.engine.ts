import path from "path";
import fs from "fs";
import { loadRawCategories, loadRawSubcategories } from "./raw-data.loader";
import type { RawCategory, RawSubcategory } from "./raw-dtos";
import { CATEGORY_CONSTANTS } from "../domain/constants/category-constants";

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

export class ValidationEngine {
  validate(): ValidationResult {
    const categories = loadRawCategories();
    const subcategories = loadRawSubcategories();
    const errors: string[] = [];
    const warnings: string[] = [];

    // Track stats
    let missingFields = 0;
    let duplicateIds = 0;

    // Check required fields and uniqueness for categories
    const categoryIds = new Set<number>();
    categories.forEach((cat: RawCategory, index) => {
      const prefix = `Category ${cat.id} (index ${index}):`;

      // Check required fields
      if (!cat.title_ar || cat.title_ar.trim() === "") {
        errors.push(`${prefix} title_ar is missing or empty`);
        missingFields++;
      }
      if (!cat.title_en || cat.title_en.trim() === "") {
        errors.push(`${prefix} title_en is missing or empty`);
        missingFields++;
      }
      if (!cat.image || cat.image.trim() === "") {
        errors.push(`${prefix} image is missing or empty`);
        missingFields++;
      }

      // Check duplicate id
      if (categoryIds.has(cat.id)) {
        errors.push(`${prefix} duplicate category ID`);
        duplicateIds++;
      }
      categoryIds.add(cat.id);

      // Check image exists
      const imagePath = path.join(process.cwd(), "public", "images", "mainCategories", cat.image);
      if (!fs.existsSync(imagePath)) {
        warnings.push(`${prefix} image ${cat.image} not found at ${imagePath}`);
      }
    });

    // Check required fields and uniqueness for subcategories
    const subcategoryIds = new Set<number>();
    const originalIdsPerCategory = new Map<number, Set<number>>();
    let orphanedSubcategories = 0;
    subcategories.forEach((sub: RawSubcategory, index) => {
      const prefix = `Subcategory ${sub.id} (index ${index}):`;

      // Check required fields
      if (!sub.title_ar || sub.title_ar.trim() === "") {
        errors.push(`${prefix} title_ar is missing or empty`);
        missingFields++;
      }
      if (!sub.title_en || sub.title_en.trim() === "") {
        errors.push(`${prefix} title_en is missing or empty`);
        missingFields++;
      }
      if (!sub.image || sub.image.trim() === "") {
        errors.push(`${prefix} image is missing or empty`);
        missingFields++;
      }
      if (typeof sub.original_id !== "number") {
        errors.push(`${prefix} original_id is missing or invalid`);
        missingFields++;
      }

      // Check duplicate id
      if (subcategoryIds.has(sub.id)) {
        errors.push(`${prefix} duplicate subcategory ID`);
        duplicateIds++;
      }
      subcategoryIds.add(sub.id);

      // Check parent exists
      if (!categoryIds.has(sub.category_id)) {
        errors.push(`${prefix} has missing parent category ${sub.category_id}`);
        orphanedSubcategories++;
      }

      // Check unique original_id within parent category
      if (!originalIdsPerCategory.has(sub.category_id)) {
        originalIdsPerCategory.set(sub.category_id, new Set());
      }
      const parentOriginalIds = originalIdsPerCategory.get(sub.category_id)!;
      if (parentOriginalIds.has(sub.original_id)) {
        errors.push(`${prefix} duplicate original_id ${sub.original_id} in parent category ${sub.category_id}`);
      }
      parentOriginalIds.add(sub.original_id);

      // Check image exists
      const imagePath = path.join(process.cwd(), "public", "images", "subCategories", sub.image);
      if (!fs.existsSync(imagePath)) {
        warnings.push(`${prefix} image ${sub.image} not found at ${imagePath}`);
      }
    });

    // Check required categories exist
    if (!categories.some(c => c.id === CATEGORY_CONSTANTS.MEDICAL_SERVICES_ID)) {
      errors.push(`Required category Medical Services (ID ${CATEGORY_CONSTANTS.MEDICAL_SERVICES_ID}) is missing`);
    }
    if (!categories.some(c => c.id === CATEGORY_CONSTANTS.DELIVERY_SERVICES_ID)) {
      errors.push(`Required category Delivery Services (ID ${CATEGORY_CONSTANTS.DELIVERY_SERVICES_ID}) is missing`);
    }

    // Check collections have consistent metadata
    const collectionMap = new Map<number, RawCategory[]>();
    categories.forEach(cat => {
      if (cat.collection !== null) {
        if (!collectionMap.has(cat.collection)) {
          collectionMap.set(cat.collection, []);
        }
        collectionMap.get(cat.collection)!.push(cat);
      }
    });
    collectionMap.forEach((items, collectionId) => {
      const first = items[0];
      items.forEach((item, idx) => {
        if (item.collection_ar !== first.collection_ar) {
          errors.push(`Collection ${collectionId} item ${idx} (ID ${item.id}) has mismatched collection_ar`);
        }
        if (item.collection_en !== first.collection_en) {
          errors.push(`Collection ${collectionId} item ${idx} (ID ${item.id}) has mismatched collection_en`);
        }
        if (item.collection_image !== first.collection_image) {
          errors.push(`Collection ${collectionId} item ${idx} (ID ${item.id}) has mismatched collection_image`);
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      stats: {
        totalCategories: categories.length,
        totalSubcategories: subcategories.length,
        totalCollections: collectionMap.size,
        orphanedSubcategories,
        duplicateIds,
        missingFields,
      },
    };
  }
}

export const validationEngine = new ValidationEngine();
