import {
  loadPharmacyActiveIngredients,
  loadPharmacyCategories,
  loadPharmacyForms,
  loadPharmacyIngredientFormLinks,
  loadPharmacyIngredientStrengthLinks,
  loadPharmacyStrengths,
  loadPharmacySubcategories,
} from "../infrastructure/pharmacy-static-catalog.loader";
import type {
  PharmacyCatalogActiveIngredient,
  PharmacyCatalogCategory,
  PharmacyCatalogForm,
  PharmacyCatalogStrength,
  PharmacyCatalogSubcategory,
} from "../entities/pharmacy-static-catalog.types";

const categories = Object.freeze(loadPharmacyCategories());
const subcategories = Object.freeze(loadPharmacySubcategories());
const activeIngredients = Object.freeze(loadPharmacyActiveIngredients());
const forms = Object.freeze(loadPharmacyForms());
const strengths = Object.freeze(loadPharmacyStrengths());
const ingredientFormLinks = Object.freeze(loadPharmacyIngredientFormLinks());
const ingredientStrengthLinks = Object.freeze(loadPharmacyIngredientStrengthLinks());
const formById = new Map(forms.map((form) => [form.id, form]));
const strengthById = new Map(strengths.map((strength) => [strength.id, strength]));

export class PharmacyStaticCatalogService {
  getCategories(): readonly PharmacyCatalogCategory[] {
    return categories;
  }

  getSubcategories(categoryId: number): readonly PharmacyCatalogSubcategory[] {
    return subcategories
      .filter((item) => item.categoryId === categoryId)
      .sort((left, right) => left.id - right.id);
  }

  getActiveIngredients(subcategoryId: number): readonly PharmacyCatalogActiveIngredient[] {
    return activeIngredients
      .filter((item) => item.subcategoryId === subcategoryId)
      .sort((left, right) => left.originalId - right.originalId);
  }

  getForms(): readonly PharmacyCatalogForm[] {
    return forms;
  }

  getStrengths(): readonly PharmacyCatalogStrength[] {
    return strengths;
  }

  getFormsForActiveIngredient(activeIngredientId: number): readonly PharmacyCatalogForm[] {
    return ingredientFormLinks
      .filter((item) => item.activeIngredientId === activeIngredientId)
      .map((item) => formById.get(item.formId))
      .filter((item): item is PharmacyCatalogForm => Boolean(item));
  }

  getStrengthsForActiveIngredient(activeIngredientId: number): readonly PharmacyCatalogStrength[] {
    return ingredientStrengthLinks
      .filter((item) => item.activeIngredientId === activeIngredientId)
      .map((item) => strengthById.get(item.strengthId))
      .filter((item): item is PharmacyCatalogStrength => Boolean(item));
  }
}

export const pharmacyStaticCatalogService = new PharmacyStaticCatalogService();
