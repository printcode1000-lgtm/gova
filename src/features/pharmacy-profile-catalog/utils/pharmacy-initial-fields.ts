import type { ProductFieldValues } from "@/features/product/entities/product.entity";
import { pharmacyStaticCatalogService } from "../services/pharmacy-static-catalog.service";

export function createPharmacyInitialFields(
  categoryId: string,
  subcategoryId: string,
): ProductFieldValues {
  const categories = pharmacyStaticCatalogService.getCategories();
  const category =
    categories.find((item) => String(item.id) === categoryId) ?? categories[0];
  const subcategories = category
    ? pharmacyStaticCatalogService.getSubcategories(category.id)
    : [];
  const subcategory =
    subcategories.find((item) => String(item.id) === subcategoryId) ??
    subcategories[0];
  const activeIngredient = subcategory
    ? pharmacyStaticCatalogService.getActiveIngredients(subcategory.id)[0]
    : undefined;
  const form = activeIngredient
    ? pharmacyStaticCatalogService.getFormsForActiveIngredient(activeIngredient.id)[0]
    : undefined;
  const strength = activeIngredient
    ? pharmacyStaticCatalogService.getStrengthsForActiveIngredient(activeIngredient.id)[0]
    : undefined;

  return {
    "mainData.name": activeIngredient?.nameAr ?? "",
    "mainData.available": "true",
    "price.current": "",
    "price.label": "السعر التجاري",
    "price.needsCar": "false",
    "pharmacyCatalog.kind": "custom",
    "pharmacyCatalog.categoryId": category ? String(category.id) : "",
    "pharmacyCatalog.categoryNameAr": category?.nameAr ?? "",
    "pharmacyCatalog.categoryNameEn": category?.nameEn ?? "",
    "pharmacyCatalog.subcategoryId": subcategory ? String(subcategory.id) : "",
    "pharmacyCatalog.subcategoryNameAr": subcategory?.nameAr ?? "",
    "pharmacyCatalog.subcategoryNameEn": subcategory?.nameEn ?? "",
    "pharmacySpecs.pharmacyCategoryId": category ? String(category.id) : "",
    "pharmacySpecs.pharmacyCategory": category?.nameAr ?? "",
    "pharmacySpecs.pharmacySubcategoryId": subcategory ? String(subcategory.id) : "",
    "pharmacySpecs.pharmacySubcategory": subcategory?.nameAr ?? "",
    "pharmacySpecs.activeIngredientId": activeIngredient
      ? String(activeIngredient.id)
      : "",
    "pharmacySpecs.activeIngredient": activeIngredient?.nameAr ?? "",
    "pharmacySpecs.nameAr": activeIngredient?.nameAr ?? "",
    "pharmacySpecs.nameEn": activeIngredient?.nameEn ?? "",
    "pharmacySpecs.formId": form?.id ?? "",
    "pharmacySpecs.form": form?.nameAr ?? "",
    "pharmacySpecs.concentrationId": strength?.id ?? "",
    "pharmacySpecs.concentration": strength?.value ?? "",
    "pharmacySpecs.prescriptionRequired": String(
      activeIngredient?.prescriptionRequired ?? false,
    ),
  };
}
