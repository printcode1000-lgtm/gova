import manifestJson from "../../../../public/catagory/manifest.json";
import categoriesJson from "../../../../public/catagory/core/categories.json";
import collectionsJson from "../../../../public/catagory/core/collections.json";
import specialtyColumnsJson from "../../../../public/catagory/core/specialty-columns.json";
import subcategoriesJson from "../../../../public/catagory/core/subcategories.json";

import type {
  CatalogCategory,
  CatalogCollection,
  CatalogManifest,
  CatalogSubcategory,
  SpecialtyColumnMapping,
} from "@/features/catalog-data/types/catalog-v3.types";
import type { Category } from "../domain/entities/category.entity";
import type { Collection } from "../domain/entities/collection.entity";
import type { Subcategory } from "../domain/entities/subcategory.entity";

type VersionedItems<T> = { schemaVersion: 3; items: T[] };
type SpecialtyColumnFile = {
  schemaVersion: 3;
  database: "profile-core";
  table: "user_specialties";
  mappings: SpecialtyColumnMapping[];
};

const manifest = Object.freeze(manifestJson as CatalogManifest);
const categoryFile = categoriesJson as VersionedItems<CatalogCategory>;
const collectionFile = collectionsJson as VersionedItems<CatalogCollection>;
const subcategoryFile = subcategoriesJson as VersionedItems<CatalogSubcategory>;
const specialtyColumnFile = specialtyColumnsJson as SpecialtyColumnFile;

const categories: readonly Category[] = Object.freeze(
  categoryFile.items.map((item) => ({
    id: item.id,
    titleAr: item.name.ar,
    titleEn: item.name.en,
    icon: item.icon,
    image: item.image,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    display: Object.freeze({ ...item.display }),
  })),
);

const collections: readonly Collection[] = Object.freeze(
  collectionFile.items.map((item) => ({
    id: item.id,
    nameAr: item.name.ar,
    nameEn: item.name.en,
    image: item.image,
    memberCategoryIds: Object.freeze([...item.memberCategoryIds]),
    display: Object.freeze({ ...item.display }),
  })),
);

const subcategories: readonly Subcategory[] = Object.freeze(
  subcategoryFile.items.map((item) => ({
    id: item.id,
    categoryId: item.categoryId,
    originalId: item.originalId,
    titleAr: item.name.ar,
    titleEn: item.name.en,
    icon: item.icon,
    image: item.image,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    groupKey:
      item.groupKey === "doctor-appointment"
        ? ("doctor-appointment" as const)
        : null,
    display: Object.freeze({ ...item.display }),
  })),
);

const specialtyMappings: readonly SpecialtyColumnMapping[] = Object.freeze(
  specialtyColumnFile.mappings.map((item) => Object.freeze({ ...item })),
);

export function loadCategories(): readonly Category[] {
  return categories;
}

export function loadCollections(): readonly Collection[] {
  return collections;
}

export function loadSubcategories(): readonly Subcategory[] {
  return subcategories;
}

export function loadSpecialtyColumnMappings(): readonly SpecialtyColumnMapping[] {
  return specialtyMappings;
}

export function loadCatalogManifest(): CatalogManifest {
  return manifest;
}
