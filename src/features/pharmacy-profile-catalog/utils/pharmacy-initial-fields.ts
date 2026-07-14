import {
  createEmptyProductDetails,
  type ProductDetails,
} from "@/features/product/entities/product.entity";
import { pharmacyStaticCatalogService } from "../services/pharmacy-static-catalog.service";

export function createPharmacyInitialDetails(
  categoryId: string,
  subcategoryId: string,
): ProductDetails {
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
  const form = pharmacyStaticCatalogService.getForms()[0];
  const strength = pharmacyStaticCatalogService.getStrengths()[0];

  return createEmptyProductDetails({
    mainData: {
      name: activeIngredient?.nameAr ?? "",
      brand: "",
      manufacturer: "",
      available: true,
      description: "",
    },
    price: {
      current: "",
      beforeDiscount: "",
      label: "السعر التجاري",
      needsCar: false,
    },
    pharmacyCatalog: {
      kind: "custom",
      categoryId: category ? String(category.id) : "",
      categoryNameAr: category?.nameAr ?? "",
      categoryNameEn: category?.nameEn ?? "",
      subcategoryId: subcategory ? String(subcategory.id) : "",
      subcategoryNameAr: subcategory?.nameAr ?? "",
      subcategoryNameEn: subcategory?.nameEn ?? "",
      fixedProductId: "",
    },
    pharmacySpecs: {
      pharmacyCategoryId: category ? String(category.id) : "",
      pharmacyCategory: category?.nameAr ?? "",
      pharmacySubcategoryId: subcategory ? String(subcategory.id) : "",
      pharmacySubcategory: subcategory?.nameAr ?? "",
      activeIngredientId: activeIngredient ? String(activeIngredient.id) : "",
      activeIngredient: activeIngredient?.nameAr ?? "",
      nameAr: activeIngredient?.nameAr ?? "",
      nameEn: activeIngredient?.nameEn ?? "",
      formId: form?.id ?? "",
      form: form?.nameAr ?? "",
      concentrationId: strength?.id ?? "",
      concentration: strength?.value ?? "",
      prescriptionRequired: activeIngredient?.prescriptionRequired ?? false,
    },
  });
}
