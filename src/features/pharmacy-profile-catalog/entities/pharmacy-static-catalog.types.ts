import type { CatalogDisplay } from "@/features/catalog-data/types/catalog-v3.types";

export interface PharmacyCatalogCategory {
  id: number;
  nameAr: string;
  nameEn: string;
  icon: string;
  display: CatalogDisplay;
}

export interface PharmacyCatalogSubcategory {
  id: number;
  categoryId: number;
  originalId: number;
  nameAr: string;
  nameEn: string;
  display: CatalogDisplay;
}

export interface PharmacyCatalogActiveIngredient {
  id: number;
  subcategoryId: number;
  originalId: number;
  nameAr: string;
  nameEn: string;
  imageUrl: string;
  prescriptionRequired: boolean;
  formIds: readonly string[];
  strengthIds: readonly string[];
  display: CatalogDisplay;
}

export interface PharmacyCatalogForm {
  id: string;
  nameAr: string;
  nameEn: string;
  display: CatalogDisplay;
}

export interface PharmacyCatalogStrength {
  id: string;
  value: string;
  display: CatalogDisplay;
}
