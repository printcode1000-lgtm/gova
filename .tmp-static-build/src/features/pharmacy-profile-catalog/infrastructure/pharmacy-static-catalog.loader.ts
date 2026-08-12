import pharmacyCategoriesJson from "../../../../public/catagory/pharmacy/categories.json";
import pharmacyFormsJson from "../../../../public/catagory/pharmacy/forms.json";
import pharmacyIngredientsJson from "../../../../public/catagory/pharmacy/ingredients.json";
import pharmacyStrengthsJson from "../../../../public/catagory/pharmacy/strengths.json";
import pharmacySubcategoriesJson from "../../../../public/catagory/pharmacy/subcategories.json";

import type {
  PharmacyCatalogCategoryV3,
  PharmacyCatalogFormV3,
  PharmacyCatalogIngredientV3,
  PharmacyCatalogStrengthV3,
  PharmacyCatalogSubcategoryV3,
} from "@/features/catalog-data/types/catalog-v3.types";
import type {
  PharmacyCatalogActiveIngredient,
  PharmacyCatalogCategory,
  PharmacyCatalogForm,
  PharmacyCatalogStrength,
  PharmacyCatalogSubcategory,
} from "../entities/pharmacy-static-catalog.types";

type VersionedItems<T> = { schemaVersion: 3; items: T[] };

const categoryFile = pharmacyCategoriesJson as VersionedItems<PharmacyCatalogCategoryV3>;
const subcategoryFile = pharmacySubcategoriesJson as VersionedItems<PharmacyCatalogSubcategoryV3>;
const ingredientFile = pharmacyIngredientsJson as VersionedItems<PharmacyCatalogIngredientV3>;
const formFile = pharmacyFormsJson as VersionedItems<PharmacyCatalogFormV3>;
const strengthFile = pharmacyStrengthsJson as VersionedItems<PharmacyCatalogStrengthV3>;

export function loadPharmacyCategories(): readonly PharmacyCatalogCategory[] {
  return categoryFile.items.map((category) => ({
    id: category.id,
    nameAr: category.name.ar,
    nameEn: category.name.en,
    icon: category.icon,
    display: Object.freeze({ ...category.display }),
  }));
}

export function loadPharmacySubcategories(): readonly PharmacyCatalogSubcategory[] {
  return subcategoryFile.items.map((subcategory) => ({
    id: subcategory.id,
    categoryId: subcategory.categoryId,
    originalId: subcategory.originalId,
    nameAr: subcategory.name.ar,
    nameEn: subcategory.name.en,
    display: Object.freeze({ ...subcategory.display }),
  }));
}

export function loadPharmacyActiveIngredients(): readonly PharmacyCatalogActiveIngredient[] {
  return ingredientFile.items.map((ingredient) => ({
    id: ingredient.id,
    subcategoryId: ingredient.subcategoryId,
    originalId: ingredient.originalId,
    nameAr: ingredient.name.ar,
    nameEn: ingredient.name.en,
    imageUrl: ingredient.imagePath,
    prescriptionRequired: ingredient.prescriptionRequired,
    formIds: Object.freeze([...ingredient.formIds]),
    strengthIds: Object.freeze([...ingredient.strengthIds]),
    display: Object.freeze({ ...ingredient.display }),
  }));
}

export function loadPharmacyForms(): readonly PharmacyCatalogForm[] {
  return formFile.items.map((form) => ({
    id: form.id,
    nameAr: form.name.ar,
    nameEn: form.name.en,
    display: Object.freeze({ ...form.display }),
  }));
}

export function loadPharmacyStrengths(): readonly PharmacyCatalogStrength[] {
  return strengthFile.items.map((strength) => ({
    id: strength.id,
    value: strength.value,
    display: Object.freeze({ ...strength.display }),
  }));
}
