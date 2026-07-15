"use client";

import { asolApi } from "@/core/api";
import type {
  PharmacyOverrideStatus,
  PharmacyProfileCatalogView,
} from "../entities/pharmacy-profile-catalog.types";

const ROUTE = "/api/pharmacy-profile-catalog";

export const pharmacyProfileCatalogApi = {
  list(uid: string, includeHidden: boolean) {
    const query = new URLSearchParams({
      uid,
      includeHidden: includeHidden ? "true" : "false",
    });
    return asolApi.get<PharmacyProfileCatalogView>(`${ROUTE}?${query.toString()}`, {
      cache: "no-store",
    });
  },

  action(input: Record<string, string>) {
    return asolApi.post<PharmacyProfileCatalogView>(ROUTE, input);
  },

  createCategory(uid: string, nameAr: string) {
    return this.action({ uid, action: "create_category", nameAr });
  },

  createSubcategory(uid: string, parentCategoryId: string, nameAr: string) {
    return this.action({
      uid,
      action: "create_subcategory",
      parentCategoryId,
      nameAr,
    });
  },

  updateCategory(uid: string, categoryId: string, nameAr: string) {
    return this.action({ uid, action: "update_category", categoryId, nameAr });
  },

  updateSubcategory(
    uid: string,
    subcategoryId: string,
    parentCategoryId: string,
    nameAr: string,
  ) {
    return this.action({
      uid,
      action: "update_subcategory",
      subcategoryId,
      parentCategoryId,
      nameAr,
    });
  },

  setCategoryStatus(uid: string, categoryId: string, status: PharmacyOverrideStatus) {
    return this.action({ uid, action: "set_category_status", categoryId, status });
  },

  setSubcategoryStatus(
    uid: string,
    subcategoryId: string,
    parentCategoryId: string,
    status: PharmacyOverrideStatus,
  ) {
    return this.action({
      uid,
      action: "set_subcategory_status",
      subcategoryId,
      parentCategoryId,
      status,
    });
  },

  setProductStatus(uid: string, productId: string, status: PharmacyOverrideStatus) {
    return this.action({ uid, action: "set_product_status", productId, status });
  },
};
