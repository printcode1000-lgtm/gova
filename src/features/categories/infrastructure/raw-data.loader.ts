import categoriesJson from "../../../../public/catagory/categories.json";
import subcategoriesJson from "../../../../public/catagory/subcategories.json";
import pharmacyCategoriesJson from "../../../../public/catagory/pharmacy/pharmacy_categories.json";
import pharmacySubcategoriesJson from "../../../../public/catagory/pharmacy/pharmacy_subcategories.json";
import pharmacyActiveIngredientsJson from "../../../../public/catagory/pharmacy/active_ingredients.json";
import pharmacyFormsJson from "../../../../public/catagory/pharmacy/forms.json";
import pharmacyStrengthsJson from "../../../../public/catagory/pharmacy/strengths.json";
import pharmacyIngredientFormsJson from "../../../../public/catagory/pharmacy/active_ingredient_forms.json";
import pharmacyIngredientStrengthsJson from "../../../../public/catagory/pharmacy/active_ingredient_strengths.json";

import type {
  PharmacyCatalogActiveIngredient,
  PharmacyCatalogCategory,
  PharmacyCatalogForm,
  PharmacyCatalogStrength,
  PharmacyCatalogSubcategory,
} from "../types/public-api";
import type {
  RawCategory,
  RawPharmacyActiveIngredient,
  RawPharmacyCategory,
  RawPharmacyForm,
  RawPharmacyIngredientFormLink,
  RawPharmacyIngredientStrengthLink,
  RawPharmacyStrength,
  RawPharmacySubcategory,
  RawSubcategory,
} from "./raw-dtos";

// This is the only production module allowed to read the canonical JSON files.
// Consumers receive domain projections from the category public API instead.
const rawCategories = Object.freeze(categoriesJson as RawCategory[]);
const rawSubcategories = Object.freeze(subcategoriesJson as RawSubcategory[]);
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

export function loadRawCategories(): readonly RawCategory[] {
  return rawCategories;
}

export function loadRawSubcategories(): readonly RawSubcategory[] {
  return rawSubcategories;
}

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

export function loadPharmacyIngredientFormLinks(): readonly {
  activeIngredientId: number;
  formId: string;
}[] {
  return rawPharmacyIngredientForms.map((item) => ({
    activeIngredientId: item.active_ingredient_id,
    formId: item.form_id,
  }));
}

export function loadPharmacyIngredientStrengthLinks(): readonly {
  activeIngredientId: number;
  strengthId: string;
}[] {
  return rawPharmacyIngredientStrengths.map((item) => ({
    activeIngredientId: item.active_ingredient_id,
    strengthId: item.strength_id,
  }));
}
