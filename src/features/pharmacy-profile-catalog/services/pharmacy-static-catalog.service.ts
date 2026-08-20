import {
  loadPharmacyActiveIngredients,
  loadPharmacyCategories,
  loadPharmacyForms,
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
import {
  isCatalogItemVisible,
  visibleCatalogItems,
} from '@asol/catalog-core';

const categories = Object.freeze(loadPharmacyCategories());
const subcategories = Object.freeze(loadPharmacySubcategories());
const activeIngredients = Object.freeze(loadPharmacyActiveIngredients());
const forms = Object.freeze(loadPharmacyForms());
const strengths = Object.freeze(loadPharmacyStrengths());
const activeIngredientById = new Map(activeIngredients.map((ingredient) => [ingredient.id, ingredient]));
const formById = new Map(forms.map((form) => [form.id, form]));
const strengthById = new Map(strengths.map((strength) => [strength.id, strength]));
const categoryById = new Map(categories.map((category) => [category.id, category]));
const subcategoryById = new Map(subcategories.map((subcategory) => [subcategory.id, subcategory]));

function isSubcategoryAvailable(item: PharmacyCatalogSubcategory): boolean {
  const parent = categoryById.get(item.categoryId);
  return parent ? isCatalogItemVisible(item, parent) : false;
}

function isIngredientAvailable(item: PharmacyCatalogActiveIngredient): boolean {
  const parent = subcategoryById.get(item.subcategoryId);
  if (!parent) return false;
  const category = categoryById.get(parent.categoryId);
  return category ? isCatalogItemVisible(item, parent, category) : false;
}

export class PharmacyStaticCatalogService {
  getCategories(): readonly PharmacyCatalogCategory[] {
    return visibleCatalogItems(categories, (item) => item.id);
  }

  getSubcategories(categoryId: number): readonly PharmacyCatalogSubcategory[] {
    const category = categoryById.get(categoryId);
    if (!category || !isCatalogItemVisible(category)) return [];
    return visibleCatalogItems(
      subcategories.filter((item) => item.categoryId === categoryId),
      (item) => item.id,
    );
  }

  getActiveIngredients(subcategoryId: number): readonly PharmacyCatalogActiveIngredient[] {
    const subcategory = subcategoryById.get(subcategoryId);
    if (!subcategory || !isSubcategoryAvailable(subcategory)) return [];
    return visibleCatalogItems(
      activeIngredients.filter((item) => item.subcategoryId === subcategoryId),
      (item) => item.id,
    );
  }

  getForms(): readonly PharmacyCatalogForm[] {
    return visibleCatalogItems(forms, (item) => item.id);
  }

  getStrengths(): readonly PharmacyCatalogStrength[] {
    return visibleCatalogItems(strengths, (item) => item.id);
  }

  getFormsForActiveIngredient(activeIngredientId: number): readonly PharmacyCatalogForm[] {
    const ingredient = activeIngredientById.get(activeIngredientId);
    if (!ingredient || !isIngredientAvailable(ingredient)) return [];
    return visibleCatalogItems(
      ingredient.formIds
      .map((formId) => formById.get(formId))
      .filter((item): item is PharmacyCatalogForm => Boolean(item)),
      (item) => item.id,
    );
  }

  getStrengthsForActiveIngredient(activeIngredientId: number): readonly PharmacyCatalogStrength[] {
    const ingredient = activeIngredientById.get(activeIngredientId);
    if (!ingredient || !isIngredientAvailable(ingredient)) return [];
    return visibleCatalogItems(
      ingredient.strengthIds
      .map((strengthId) => strengthById.get(strengthId))
      .filter((item): item is PharmacyCatalogStrength => Boolean(item)),
      (item) => item.id,
    );
  }
}

export const pharmacyStaticCatalogService = new PharmacyStaticCatalogService();
