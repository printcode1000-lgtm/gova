export interface RawCategory {
  id: number;
  title_ar: string;
  title_en: string;
  icon?: string;
  image: string;
  created_at?: string;
  updated_at?: string;
  collection: number | null;
  collection_ar?: string | null;
  collection_en?: string | null;
  collection_image?: string | null;
  order: number | null;
}

export interface RawSubcategory {
  id: number;
  category_id: number;
  original_id: number;
  title_ar: string;
  title_en: string;
  icon?: string;
  image: string;
  created_at?: string;
  updated_at?: string;
  sub_collection: number | null | string;
}

export interface RawPharmacyCategory {
  id: number;
  title_ar: string;
  title_en: string;
  icon: string;
}

export interface RawPharmacySubcategory {
  id: number;
  pharmacy_category_id: number;
  original_id: number;
  title_ar: string;
  title_en: string;
}

export interface RawPharmacyActiveIngredient {
  id: number;
  pharmacy_subcategory_id: number;
  original_id: number;
  name_ar: string;
  name_en: string;
  image_url: string;
  is_prescription_required: 0 | 1;
}

export interface RawPharmacyForm {
  id: string;
  name_ar: string;
  name_en: string;
}

export interface RawPharmacyStrength {
  id: string;
  value: string;
}

export interface RawPharmacyIngredientFormLink {
  active_ingredient_id: number;
  form_id: string;
}

export interface RawPharmacyIngredientStrengthLink {
  active_ingredient_id: number;
  strength_id: string;
}
