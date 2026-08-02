export interface PharmacyCatalogCategory {
  id: number;
  nameAr: string;
  nameEn: string;
  icon: string;
}

export interface PharmacyCatalogSubcategory {
  id: number;
  categoryId: number;
  originalId: number;
  nameAr: string;
  nameEn: string;
}

export interface PharmacyCatalogActiveIngredient {
  id: number;
  subcategoryId: number;
  originalId: number;
  nameAr: string;
  nameEn: string;
  imageUrl: string;
  prescriptionRequired: boolean;
}

export interface PharmacyCatalogForm {
  id: string;
  nameAr: string;
  nameEn: string;
}

export interface PharmacyCatalogStrength {
  id: string;
  value: string;
}

export interface PharmacyIngredientFormLink {
  activeIngredientId: number;
  formId: string;
}

export interface PharmacyIngredientStrengthLink {
  activeIngredientId: number;
  strengthId: string;
}
