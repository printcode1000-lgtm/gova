import "server-only";
import type { ProductRecord } from "@asol/product-core";
import type { ProductDetails } from "@asol/product-core";
import { createEmptyProductDetails } from "@asol/product-core";
import {
  PHARMACY_MAIN_CATEGORY_ID,
  PHARMACY_PRICE_LABEL,
  PHARMACY_SUBCATEGORY_ID,
  type PharmacyOverrideStatus,
  type PharmacyProfileCatalogCategoryView,
  type PharmacyProfileCatalogProductView,
  type PharmacyProfileCatalogSubcategoryView,
  type PharmacyProfileCatalogView,
  type PharmacyProfileProduct,
  type PharmacyProfileProductOverride,
} from "../../../domain/pharmacy-profile-catalog.types";
import { pharmacyStaticCatalogService } from "../../../application/services/pharmacy-static-catalog.service";
import { pharmacyProfileCatalogRepository } from "@asol/data-core/pharmacy-profile-catalog";
import {
  encodePharmacyFixedProductId,
  parsePharmacyFixedProductId,
} from "../../../application/utils/pharmacy-product-id";
import { PharmacyProfileCatalogPart2 } from "./pharmacy-profile-catalog.service.part-02";
function imageUrl(value: string) {
  if (!value) return "";
  return value.startsWith("/") ? value : `/${value}`;
}
function firstForm(activeIngredientId: number) {
  return pharmacyStaticCatalogService.getFormsForActiveIngredient(activeIngredientId)[0];
}
function firstStrength(activeIngredientId: number) {
  return pharmacyStaticCatalogService.getStrengthsForActiveIngredient(activeIngredientId)[0];
}
function sortByName(left: ProductRecord, right: ProductRecord) {
  return left.mainData.name.localeCompare(right.mainData.name, "ar");
}
function overrideByFixedId(overrides: PharmacyProfileProductOverride[]) {
  return new Map(
    overrides
      .filter((override) => override.fixedProductId !== null)
      .map((override) => [override.fixedProductId!, override]),
  );
}
const fixedSort = (value: number | null, fallback: number) => value ?? fallback;

export class PharmacyProfileCatalogPart3 extends PharmacyProfileCatalogPart2 {
  protected customOverrideToProductRecord(
    uid: string,
    override: PharmacyProfileProductOverride,
  ): PharmacyProfileProduct {
    const now = override.updatedAt;
    return {
      id: override.id,
      uid,
      mainCategoryId: PHARMACY_MAIN_CATEGORY_ID,
      subcategoryId: PHARMACY_SUBCATEGORY_ID,
      status: "active",
      createdAt: override.createdAt,
      updatedAt: now,
      ...createEmptyProductDetails({
        mainData: {
          name: override.nameAr || "منتج صيدلية",
          brand: "",
          manufacturer: "",
          available: true,
          description: override.description || "",
        },
        price: {
          current:
            override.priceMinor === null || override.priceMinor === undefined
              ? ""
              : String(override.priceMinor / 100),
          beforeDiscount: "",
          label: override.priceText || PHARMACY_PRICE_LABEL,
          needsCar: false,
        },
        pharmacyCatalog: {
          kind: "custom",
          categoryId: "",
          categoryNameAr: "",
          categoryNameEn: "",
          subcategoryId: override.parentSubcategoryId,
          subcategoryNameAr: "",
          subcategoryNameEn: "",
          fixedProductId: "",
        },
        pharmacySpecs: {
          pharmacyCategoryId: "",
          pharmacyCategory: "",
          pharmacySubcategoryId: override.parentSubcategoryId,
          pharmacySubcategory: "",
          activeIngredientId: "",
          activeIngredient: override.nameAr || "",
          nameAr: override.nameAr || "",
          nameEn: override.nameEn || "",
          formId: override.formId || "",
          form: override.formNameAr || "",
          concentrationId: override.strengthId || "",
          concentration: override.strengthValue || "",
          prescriptionRequired: override.prescriptionRequired ?? false,
        },
        images: override.imageUrl
          ? [{ imageKey: override.imageKey || override.id, url: override.imageUrl }]
          : [],
      }),
      pharmacy: {
        fixedProductId: null,
        fixedSubcategoryId: null,
        fixedCategoryId: null,
        isFixedBase: false,
      },
    };
  }
}
