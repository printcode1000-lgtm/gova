import pharmacyActiveIngredientsJson from "../../../../public/catagory/pharmacy/active_ingredients.json";
import pharmacyIngredientFormsJson from "../../../../public/catagory/pharmacy/active_ingredient_forms.json";
import pharmacyIngredientStrengthsJson from "../../../../public/catagory/pharmacy/active_ingredient_strengths.json";
import pharmacyFormsJson from "../../../../public/catagory/pharmacy/forms.json";
import pharmacyCategoriesJson from "../../../../public/catagory/pharmacy/pharmacy_categories.json";
import pharmacySubcategoriesJson from "../../../../public/catagory/pharmacy/pharmacy_subcategories.json";
import pharmacyStrengthsJson from "../../../../public/catagory/pharmacy/strengths.json";

import type {
  PharmacyCatalogActiveIngredient,
  PharmacyCatalogCategory,
  PharmacyCatalogForm,
  PharmacyCatalogStrength,
  PharmacyCatalogSubcategory,
  PharmacyIngredientFormLink,
  PharmacyIngredientStrengthLink,
} from "../entities/pharmacy-static-catalog.types";

interface RawPharmacyCategory {
  id: number;
  title_ar: string;
  title_en: string;
  icon: string;
}

interface RawPharmacySubcategory {
  id: number;
  pharmacy_category_id: number;
  original_id: number;
  title_ar: string;
  title_en: string;
}

interface RawPharmacyActiveIngredient {
  id: number;
  pharmacy_subcategory_id: number;
  original_id: number;
  name_ar: string;
  name_en: string;
  image_url: string;
  is_prescription_required: 0 | 1;
}

interface RawPharmacyForm {
  id: string;
  name_ar: string;
  name_en: string;
}

interface RawPharmacyStrength {
  id: string;
  value: string;
}

interface RawPharmacyIngredientFormLink {
  active_ingredient_id: number;
  form_id: string;
}

interface RawPharmacyIngredientStrengthLink {
  active_ingredient_id: number;
  strength_id: string;
}

const rawPharmacyCategories = Object.freeze(
  pharmacyCategoriesJson as RawPharmacyCategory[],
);
const rawPharmacySubcategories = Object.freeze(
  pharmacySubcategoriesJson as RawPharmacySubcategory[],
);
const rawPharmacyActiveIngredients = Object.freeze(
  pharmacyActiveIngredientsJson as RawPharmacyActiveIngredient[],
);
const rawPharmacyForms = Object.freeze(pharmacyFormsJson as RawPharmacyForm[]);
const rawPharmacyStrengths = Object.freeze(
  pharmacyStrengthsJson as RawPharmacyStrength[],
);
const rawPharmacyIngredientForms = Object.freeze(
  pharmacyIngredientFormsJson as RawPharmacyIngredientFormLink[],
);
const rawPharmacyIngredientStrengths = Object.freeze(
  pharmacyIngredientStrengthsJson as RawPharmacyIngredientStrengthLink[],
);

export function loadPharmacyCategories(): readonly PharmacyCatalogCategory[] {
  return rawPharmacyCategories.map((category) => ({
    id: category.id,
    nameAr: category.title_ar,
    nameEn: category.title_en,
    icon: category.icon,
  }));
}

export function loadPharmacySubcategories(): readonly PharmacyCatalogSubcategory[] {
  return rawPharmacySubcategories.map((subcategory) => ({
    id: subcategory.id,
    categoryId: subcategory.pharmacy_category_id,
    originalId: subcategory.original_id,
    nameAr: subcategory.title_ar,
    nameEn: subcategory.title_en,
  }));
}

export function loadPharmacyActiveIngredients(): readonly PharmacyCatalogActiveIngredient[] {
  return rawPharmacyActiveIngredients.map((activeIngredient) => ({
    id: activeIngredient.id,
    subcategoryId: activeIngredient.pharmacy_subcategory_id,
    originalId: activeIngredient.original_id,
    nameAr: activeIngredient.name_ar,
    nameEn: activeIngredient.name_en,
    imageUrl: activeIngredient.image_url,
    prescriptionRequired: activeIngredient.is_prescription_required === 1,
  }));
}

export function loadPharmacyForms(): readonly PharmacyCatalogForm[] {
  return rawPharmacyForms.map((form) => ({
    id: form.id,
    nameAr: form.name_ar,
    nameEn: form.name_en,
  }));
}

export function loadPharmacyStrengths(): readonly PharmacyCatalogStrength[] {
  return rawPharmacyStrengths.map((strength) => ({
    id: strength.id,
    value: strength.value,
  }));
}

export function loadPharmacyIngredientFormLinks(): readonly PharmacyIngredientFormLink[] {
  return rawPharmacyIngredientForms.map((item) => ({
    activeIngredientId: item.active_ingredient_id,
    formId: item.form_id,
  }));
}

export function loadPharmacyIngredientStrengthLinks(): readonly PharmacyIngredientStrengthLink[] {
  return rawPharmacyIngredientStrengths.map((item) => ({
    activeIngredientId: item.active_ingredient_id,
    strengthId: item.strength_id,
  }));
}
