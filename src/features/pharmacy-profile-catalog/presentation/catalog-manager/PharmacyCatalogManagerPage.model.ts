import {
  PHARMACY_MAIN_CATEGORY_ID,
  PHARMACY_SUBCATEGORY_ID,
  type PharmacyProfileCatalogCategoryView,
  type PharmacyProfileCatalogSubcategoryView,
  type PharmacyProfileCatalogView,
} from "../../domain/pharmacy-profile-catalog.types";

export type PharmacyCatalogEditDialog =
  | { mode: "create"; kind: "category" | "subcategory" }
  | {
      mode: "edit";
      kind: "category";
      item: PharmacyProfileCatalogCategoryView;
    }
  | {
      mode: "edit";
      kind: "subcategory";
      item: PharmacyProfileCatalogSubcategoryView;
    };

export function sortedPharmacyCategories(catalog: PharmacyProfileCatalogView | null) {
  return [...(catalog?.categories ?? [])].sort((left, right) => left.sortOrder - right.sortOrder);
}

export function sortedPharmacySubcategories(
  catalog: PharmacyProfileCatalogView | null,
  activeCategoryId: string,
) {
  return (catalog?.subcategories ?? [])
    .filter((item) => item.parentCategoryId === activeCategoryId)
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export function sortedPharmacyProducts(
  catalog: PharmacyProfileCatalogView | null,
  activeSubcategoryId: string,
) {
  return (catalog?.products ?? [])
    .filter((item) => item.parentSubcategoryId === activeSubcategoryId)
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export function buildAddPharmacyProductHref({
  activeCategoryId,
  activeSubcategoryId,
}: {
  activeCategoryId: string;
  activeSubcategoryId: string;
}) {
  return `/product?${new URLSearchParams({
    mode: "new",
    mainCategoryId: PHARMACY_MAIN_CATEGORY_ID,
    subcategoryId: PHARMACY_SUBCATEGORY_ID,
    pharmacyCategoryId: activeCategoryId,
    pharmacySubcategoryId: activeSubcategoryId,
    returnTo: "profile-products",
  }).toString()}`;
}
