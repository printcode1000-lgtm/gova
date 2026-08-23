import "server-only";
import type { ProductRecord } from "@/features/product";
import type { ProductDetails } from "@/features/product";
import { createEmptyProductDetails } from "@/features/product";
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
} from "../../domain/pharmacy-profile-catalog.types";
import { pharmacyStaticCatalogService } from "../pharmacy-static-catalog.service";
import { pharmacyProfileCatalogRepository } from "@asol/data-core/pharmacy-profile-catalog";
import {
  encodePharmacyFixedProductId,
  parsePharmacyFixedProductId,
} from "../../utils/pharmacy-product-id";
import { PharmacyProfileCatalogPart1 } from "./pharmacy-profile-catalog.service.part-01";
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

export abstract class PharmacyProfileCatalogPart2 extends PharmacyProfileCatalogPart1 {
  async updateCategory(uid: string, categoryId: string, nameAr: string, nameEn?: string) {
    await pharmacyProfileCatalogRepository.updateCategoryName({
      uid,
      categoryId,
      nameAr,
      nameEn,
    });
  }

  async updateSubcategory(
    uid: string,
    subcategoryId: string,
    parentCategoryId: string,
    nameAr: string,
    nameEn?: string,
  ) {
    await pharmacyProfileCatalogRepository.updateSubcategoryName({
      uid,
      subcategoryId,
      parentCategoryId,
      nameAr,
      nameEn,
    });
  }

  async setCategoryStatus(uid: string, categoryId: string, status: PharmacyOverrideStatus) {
    const fixedCategoryId = Number(categoryId);
    if (Number.isInteger(fixedCategoryId)) {
      await pharmacyProfileCatalogRepository.setFixedCategoryStatus(uid, fixedCategoryId, status);
      return;
    }
    await pharmacyProfileCatalogRepository.setCustomCategoryStatus(uid, categoryId, status);
  }

  async setSubcategoryStatus(
    uid: string,
    subcategoryId: string,
    parentCategoryId: string,
    status: PharmacyOverrideStatus,
  ) {
    const fixedSubcategoryId = Number(subcategoryId);
    if (Number.isInteger(fixedSubcategoryId)) {
      await pharmacyProfileCatalogRepository.setFixedSubcategoryStatus(
        uid,
        fixedSubcategoryId,
        parentCategoryId,
        status,
      );
      return;
    }
    await pharmacyProfileCatalogRepository.setCustomSubcategoryStatus(uid, subcategoryId, status);
  }

  async setProductStatus(uid: string, productId: string, status: PharmacyOverrideStatus) {
    const identity = parsePharmacyFixedProductId(productId);
    if (!identity || identity.uid !== uid) return;
    const product = await this.getProduct(productId);
    if (status === "hidden") {
      await this.hideFixedProduct(productId, uid);
      return;
    }
    await pharmacyProfileCatalogRepository.upsertFixedProductOverride({
      uid,
      fixedProductId: identity.fixedProductId,
      parentSubcategoryId:
        product?.pharmacyCatalog.subcategoryId ||
        product?.pharmacySpecs.pharmacySubcategoryId ||
        "",
      status: "visible",
    });
  }

  async updateFixedProduct(
    productId: string,
    uid: string,
    details: ProductDetails,
  ): Promise<ProductRecord | null> {
    const identity = parsePharmacyFixedProductId(productId);
    if (!identity || identity.uid !== uid) return null;
    const firstImage = details.images[0] ?? null;
    const isLocalFixedImage = firstImage?.imageKey?.startsWith("pharmacy-fixed/");
    const priceValue = Number(details.price.current);
    const priceMinor = Number.isFinite(priceValue) && priceValue > 0
      ? Math.round(priceValue * 100)
      : null;
    await pharmacyProfileCatalogRepository.upsertFixedProductOverride({
      uid,
      fixedProductId: identity.fixedProductId,
      parentSubcategoryId:
        details.pharmacyCatalog.subcategoryId ||
        details.pharmacySpecs.pharmacySubcategoryId ||
        "",
      nameAr:
        details.pharmacySpecs.nameAr ||
        details.pharmacySpecs.activeIngredient ||
        details.mainData.name ||
        null,
      nameEn: details.pharmacySpecs.nameEn || null,
      description: details.mainData.description || null,
      imageUrl: firstImage && !isLocalFixedImage ? firstImage.url : null,
      imageKey: firstImage && !isLocalFixedImage ? firstImage.imageKey : null,
      formId: details.pharmacySpecs.formId || null,
      formNameAr: details.pharmacySpecs.form || null,
      strengthId: details.pharmacySpecs.concentrationId || null,
      strengthValue: details.pharmacySpecs.concentration || null,
      prescriptionRequired: details.pharmacySpecs.prescriptionRequired,
      priceText: details.price.label || PHARMACY_PRICE_LABEL,
      priceMinor,
      status: "visible",
    });
    return this.getProduct(productId);
  }

  async hideFixedProduct(productId: string, uid: string): Promise<boolean> {
    const product = await this.getProduct(productId);
    const identity = parsePharmacyFixedProductId(productId);
    if (!product || !identity || identity.uid !== uid) return false;
    await pharmacyProfileCatalogRepository.upsertFixedProductOverride({
      uid,
      fixedProductId: identity.fixedProductId,
      parentSubcategoryId:
        product.pharmacyCatalog.subcategoryId ||
        product.pharmacySpecs.pharmacySubcategoryId ||
        "",
      status: "hidden",
    });
    return true;
  }

  protected toProductRecord(
    uid: string,
    source: {
      category: ReturnType<typeof pharmacyStaticCatalogService.getCategories>[number];
      subcategory: ReturnType<typeof pharmacyStaticCatalogService.getSubcategories>[number];
      activeIngredient: ReturnType<typeof pharmacyStaticCatalogService.getActiveIngredients>[number];
    },
    override?: PharmacyProfileProductOverride | null,
  ): PharmacyProfileProduct {
    const { category, subcategory, activeIngredient } = source;
    const form = override?.formId
      ? { id: override.formId, nameAr: override.formNameAr ?? "" }
      : firstForm(activeIngredient.id);
    const strength = override?.strengthId
      ? { id: override.strengthId, value: override.strengthValue ?? "" }
      : firstStrength(activeIngredient.id);
    const now = override?.updatedAt ?? "2026-01-01T00:00:00.000Z";
    const localImageUrl = imageUrl(activeIngredient.imageUrl);
    const finalImageUrl = override?.imageUrl || localImageUrl;
    const imageKey = override?.imageKey || `pharmacy-fixed/${activeIngredient.originalId}`;

    return {
      id: encodePharmacyFixedProductId(uid, activeIngredient.originalId),
      uid,
      mainCategoryId: PHARMACY_MAIN_CATEGORY_ID,
      subcategoryId: PHARMACY_SUBCATEGORY_ID,
      status: "active",
      createdAt: override?.createdAt ?? now,
      updatedAt: now,
      ...createEmptyProductDetails({
        mainData: {
          name: override?.nameAr || activeIngredient.nameAr,
          brand: "",
          manufacturer: "",
          available: true,
          description:
            override?.description ||
            `${subcategory.nameAr} - ${activeIngredient.nameEn}`,
        },
        price: {
          current:
            override?.priceMinor === null || override?.priceMinor === undefined
              ? ""
              : String(override.priceMinor / 100),
          beforeDiscount: "",
          label: override?.priceText || PHARMACY_PRICE_LABEL,
          needsCar: false,
        },
        pharmacyCatalog: {
          kind: "fixed",
          categoryId: String(category.id),
          categoryNameAr: category.nameAr,
          categoryNameEn: category.nameEn,
          subcategoryId: String(subcategory.id),
          subcategoryNameAr: subcategory.nameAr,
          subcategoryNameEn: subcategory.nameEn,
          fixedProductId: String(activeIngredient.originalId),
        },
        pharmacySpecs: {
          pharmacyCategoryId: String(category.id),
          pharmacyCategory: category.nameAr,
          pharmacySubcategoryId: String(subcategory.id),
          pharmacySubcategory: subcategory.nameAr,
          activeIngredientId: String(activeIngredient.id),
          activeIngredient: override?.nameAr || activeIngredient.nameAr,
          nameAr: override?.nameAr || activeIngredient.nameAr,
          nameEn: override?.nameEn || activeIngredient.nameEn,
          formId: form?.id ?? "",
          form: form?.nameAr ?? "",
          concentrationId: strength?.id ?? "",
          concentration: strength?.value ?? "",
          prescriptionRequired:
            override?.prescriptionRequired ?? activeIngredient.prescriptionRequired,
        },
        images: finalImageUrl ? [{ imageKey, url: finalImageUrl }] : [],
      }),
      pharmacy: {
        fixedProductId: activeIngredient.originalId,
        fixedSubcategoryId: subcategory.id,
        fixedCategoryId: category.id,
        isFixedBase: !override,
      },
    };
  }
}
