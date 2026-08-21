import type { ProductMode } from "./product-component.types";

export function productPageRouteModel(searchParams: Pick<URLSearchParams, "get">) {
  const requestedMode = searchParams.get("mode");
  const mode: ProductMode =
    requestedMode === "edit" || requestedMode === "new"
      ? requestedMode
      : "view";
  const returnTo = searchParams.get("returnTo");

  return {
    mode,
    productId: searchParams.get("productId") ?? "",
    initialMain: searchParams.get("mainCategoryId") ?? "",
    initialSub: searchParams.get("subcategoryId") ?? "",
    initialPharmacyCategory: searchParams.get("pharmacyCategoryId") ?? "",
    initialPharmacySubcategory:
      searchParams.get("pharmacySubcategoryId") ?? "",
    returnUrl:
      returnTo === "profile-products" ? "/profile?mode=edit&tab=products" : null,
  };
}
