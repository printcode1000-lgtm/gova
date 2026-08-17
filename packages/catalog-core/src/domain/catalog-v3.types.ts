export interface LocalizedText {
  ar: string;
  en: string;
  [locale: string]: string;
}

export interface AuditTimestamps {
  createdAt: string;
  updatedAt: string;
}

export interface CatalogDisplay {
  order: number;
  hidden: boolean;
}

export interface CatalogCategory extends AuditTimestamps {
  id: number;
  name: LocalizedText;
  icon: string;
  image: string;
  display: CatalogDisplay;
}

export interface CatalogCollection {
  id: number;
  name: LocalizedText;
  image: string;
  memberCategoryIds: number[];
  display: CatalogDisplay;
}

export interface CatalogSubcategory extends AuditTimestamps {
  id: number;
  categoryId: number;
  originalId: number;
  name: LocalizedText;
  icon: string;
  image: string;
  groupKey: string | null;
  display: CatalogDisplay;
}

export type SpecialtyMappingKind =
  | "subcategory"
  | "doctor-specialty"
  | "collection-member"
  | "direct-category";

export interface SpecialtyColumnMapping {
  key: string;
  kind: SpecialtyMappingKind;
  mainId: number;
  childId: number | null;
  column: string;
}

export interface PharmacyCatalogCategoryV3 extends AuditTimestamps {
  id: number;
  name: LocalizedText;
  icon: string;
  display: CatalogDisplay;
}

export interface PharmacyCatalogSubcategoryV3 extends AuditTimestamps {
  id: number;
  categoryId: number;
  originalId: number;
  name: LocalizedText;
  display: CatalogDisplay;
}

export interface PharmacyCatalogIngredientV3 extends AuditTimestamps {
  id: number;
  subcategoryId: number;
  originalId: number;
  name: LocalizedText;
  imagePath: string;
  prescriptionRequired: boolean;
  formIds: string[];
  strengthIds: string[];
  display: CatalogDisplay;
}

export interface PharmacyCatalogFormV3 extends AuditTimestamps {
  id: string;
  name: LocalizedText;
  display: CatalogDisplay;
}

export interface PharmacyCatalogStrengthV3 extends AuditTimestamps {
  id: string;
  value: string;
  display: CatalogDisplay;
}

export interface VehicleCatalogGroup {
  key: string;
  name: LocalizedText;
  optionFile: string;
  supportsImage: boolean;
  display: CatalogDisplay;
}

export interface VehicleCatalogOption {
  id: string;
  name: LocalizedText;
  image: string | null;
  isDefault: boolean;
  display: CatalogDisplay;
}

export interface CatalogManifest {
  schemaVersion: 3;
  catalogVersion: string;
  datasets: {
    core: {
      categories: string;
      subcategories: string;
      collections: string;
      specialtyColumns: string;
    };
    pharmacy: {
      categories: string;
      subcategories: string;
      ingredients: string;
      forms: string;
      strengths: string;
    };
    vehicles: { groups: string };
  };
  assets: {
    mainCategories: string;
    subcategories: string;
    pharmacy: string;
    vehicles: string;
  };
}
