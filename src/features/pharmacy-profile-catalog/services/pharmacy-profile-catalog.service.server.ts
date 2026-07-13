import "server-only";

import { categoryService } from "@/features/categories";
import type { ProductRecord } from "@/features/product/entities/product.entity";
import type { ProductData } from "@/features/product/entities/product.entity";
import {
  PHARMACY_MAIN_CATEGORY_ID,
  PHARMACY_PRICE_LABEL,
  PHARMACY_SUBCATEGORY_ID,
  type PharmacyProfileProduct,
  type PharmacyProfileProductOverride,
} from "../entities/pharmacy-profile-catalog.types";
import { pharmacyProfileCatalogRepository } from "../repositories/pharmacy-profile-catalog-repository";
import {
  encodePharmacyFixedProductId,
  parsePharmacyFixedProductId,
} from "../utils/pharmacy-product-id";

function imageUrl(value: string) {
  if (!value) return "";
  return value.startsWith("/") ? value : `/${value}`;
}

function firstForm(activeIngredientId: number) {
  return categoryService.getPharmacyFormsForActiveIngredient(activeIngredientId)[0];
}

function firstStrength(activeIngredientId: number) {
  return categoryService.getPharmacyStrengthsForActiveIngredient(activeIngredientId)[0];
}

function sortByName(left: ProductRecord, right: ProductRecord) {
  return (
    left.data.fields["mainData.name"] || ""
  ).localeCompare(right.data.fields["mainData.name"] || "", "ar");
}

function overrideByFixedId(overrides: PharmacyProfileProductOverride[]) {
  return new Map(
    overrides
      .filter((override) => override.fixedProductId !== null)
      .map((override) => [override.fixedProductId!, override]),
  );
}

export class PharmacyProfileCatalogService {
  isPharmacyProductBucket(mainCategoryId: string, subcategoryId: string) {
    return (
      mainCategoryId === PHARMACY_MAIN_CATEGORY_ID &&
      subcategoryId === PHARMACY_SUBCATEGORY_ID
    );
  }

  parseFixedProductId(productId: string) {
    return parsePharmacyFixedProductId(productId);
  }

  async getProduct(productId: string): Promise<PharmacyProfileProduct | null> {
    const identity = parsePharmacyFixedProductId(productId);
    if (!identity) return null;
    const product = categoryService
      .getPharmacyCategories()
      .flatMap((category) =>
        categoryService.getPharmacySubcategories(category.id).flatMap((subcategory) =>
          categoryService
            .getPharmacyActiveIngredients(subcategory.id)
            .filter(
              (activeIngredient) =>
                activeIngredient.originalId === identity.fixedProductId,
            )
            .map((activeIngredient) => ({
              category,
              subcategory,
              activeIngredient,
            })),
        ),
      )[0];
    if (!product) return null;
    const override =
      await pharmacyProfileCatalogRepository.findProductOverrideByFixedId(
        identity.uid,
        identity.fixedProductId,
      );
    if (override?.status === "hidden") return null;
    return this.toProductRecord(identity.uid, product, override);
  }

  async listProducts(uid: string): Promise<ProductRecord[]> {
    const overrides = await pharmacyProfileCatalogRepository.listProductOverrides(uid);
    const overridesByFixedId = overrideByFixedId(overrides);
    const products: ProductRecord[] = [];

    for (const category of categoryService.getPharmacyCategories()) {
      for (const subcategory of categoryService.getPharmacySubcategories(category.id)) {
        for (const activeIngredient of categoryService.getPharmacyActiveIngredients(
          subcategory.id,
        )) {
          const override = overridesByFixedId.get(activeIngredient.originalId);
          if (override?.status === "hidden") continue;
          products.push(
            this.toProductRecord(uid, { category, subcategory, activeIngredient }, override),
          );
        }
      }
    }

    for (const override of overrides.filter((item) => item.fixedProductId === null)) {
      if (override.status === "hidden") continue;
      products.push(this.customOverrideToProductRecord(uid, override));
    }

    return products.sort(sortByName);
  }

  async updateFixedProduct(
    productId: string,
    uid: string,
    data: ProductData,
  ): Promise<ProductRecord | null> {
    const identity = parsePharmacyFixedProductId(productId);
    if (!identity || identity.uid !== uid) return null;
    const firstImage = data.images[0] ?? null;
    const isLocalFixedImage = firstImage?.imageKey?.startsWith("pharmacy-fixed/");
    const priceValue = Number(data.fields["price.current"] ?? "");
    const priceMinor = Number.isFinite(priceValue) && priceValue > 0
      ? Math.round(priceValue * 100)
      : null;
    await pharmacyProfileCatalogRepository.upsertFixedProductOverride({
      uid,
      fixedProductId: identity.fixedProductId,
      parentSubcategoryId:
        data.fields["pharmacyCatalog.subcategoryId"] ||
        data.fields["pharmacySpecs.pharmacySubcategoryId"] ||
        "",
      nameAr:
        data.fields["pharmacySpecs.nameAr"] ||
        data.fields["pharmacySpecs.activeIngredient"] ||
        data.fields["mainData.name"] ||
        null,
      nameEn: data.fields["pharmacySpecs.nameEn"] || null,
      description: data.fields["mainData.description"] || null,
      imageUrl: firstImage && !isLocalFixedImage ? firstImage.url : null,
      imageKey: firstImage && !isLocalFixedImage ? firstImage.imageKey : null,
      formId: data.fields["pharmacySpecs.formId"] || null,
      formNameAr: data.fields["pharmacySpecs.form"] || null,
      strengthId: data.fields["pharmacySpecs.concentrationId"] || null,
      strengthValue: data.fields["pharmacySpecs.concentration"] || null,
      prescriptionRequired:
        data.fields["pharmacySpecs.prescriptionRequired"] === "true",
      priceText: data.fields["price.label"] || PHARMACY_PRICE_LABEL,
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
        product.data.fields["pharmacyCatalog.subcategoryId"] ||
        product.data.fields["pharmacySpecs.pharmacySubcategoryId"] ||
        "",
      status: "hidden",
    });
    return true;
  }

  private toProductRecord(
    uid: string,
    source: {
      category: ReturnType<typeof categoryService.getPharmacyCategories>[number];
      subcategory: ReturnType<typeof categoryService.getPharmacySubcategories>[number];
      activeIngredient: ReturnType<typeof categoryService.getPharmacyActiveIngredients>[number];
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
      data: {
        fields: {
          "mainData.name": override?.nameAr || activeIngredient.nameAr,
          "mainData.description":
            override?.description ||
            `${subcategory.nameAr} - ${activeIngredient.nameEn}`,
          "mainData.available": "true",
          "price.current":
            override?.priceMinor === null || override?.priceMinor === undefined
              ? ""
              : String(override.priceMinor / 100),
          "price.label": override?.priceText || PHARMACY_PRICE_LABEL,
          "price.needsCar": "false",
          "pharmacyCatalog.kind": "fixed",
          "pharmacyCatalog.categoryId": String(category.id),
          "pharmacyCatalog.categoryNameAr": category.nameAr,
          "pharmacyCatalog.categoryNameEn": category.nameEn,
          "pharmacyCatalog.subcategoryId": String(subcategory.id),
          "pharmacyCatalog.subcategoryNameAr": subcategory.nameAr,
          "pharmacyCatalog.subcategoryNameEn": subcategory.nameEn,
          "pharmacyCatalog.fixedProductId": String(activeIngredient.originalId),
          "pharmacySpecs.pharmacyCategoryId": String(category.id),
          "pharmacySpecs.pharmacyCategory": category.nameAr,
          "pharmacySpecs.pharmacySubcategoryId": String(subcategory.id),
          "pharmacySpecs.pharmacySubcategory": subcategory.nameAr,
          "pharmacySpecs.activeIngredientId": String(activeIngredient.id),
          "pharmacySpecs.activeIngredient":
            override?.nameAr || activeIngredient.nameAr,
          "pharmacySpecs.nameAr": override?.nameAr || activeIngredient.nameAr,
          "pharmacySpecs.nameEn": override?.nameEn || activeIngredient.nameEn,
          "pharmacySpecs.formId": form?.id ?? "",
          "pharmacySpecs.form": form?.nameAr ?? "",
          "pharmacySpecs.concentrationId": strength?.id ?? "",
          "pharmacySpecs.concentration": strength?.value ?? "",
          "pharmacySpecs.prescriptionRequired": String(
            override?.prescriptionRequired ?? activeIngredient.prescriptionRequired,
          ),
        },
        images: finalImageUrl
          ? [{ imageKey, url: finalImageUrl }]
          : [],
      },
      pharmacy: {
        fixedProductId: activeIngredient.originalId,
        fixedSubcategoryId: subcategory.id,
        fixedCategoryId: category.id,
        isFixedBase: !override,
      },
    };
  }

  private customOverrideToProductRecord(
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
      data: {
        fields: {
          "mainData.name": override.nameAr || "منتج صيدلية",
          "mainData.description": override.description || "",
          "mainData.available": "true",
          "price.current":
            override.priceMinor === null || override.priceMinor === undefined
              ? ""
              : String(override.priceMinor / 100),
          "price.label": override.priceText || PHARMACY_PRICE_LABEL,
          "price.needsCar": "false",
          "pharmacyCatalog.kind": "custom",
          "pharmacyCatalog.subcategoryId": override.parentSubcategoryId,
          "pharmacySpecs.nameAr": override.nameAr || "",
          "pharmacySpecs.nameEn": override.nameEn || "",
          "pharmacySpecs.formId": override.formId || "",
          "pharmacySpecs.form": override.formNameAr || "",
          "pharmacySpecs.concentrationId": override.strengthId || "",
          "pharmacySpecs.concentration": override.strengthValue || "",
          "pharmacySpecs.prescriptionRequired": String(
            override.prescriptionRequired ?? false,
          ),
        },
        images: override.imageUrl
          ? [{ imageKey: override.imageKey || override.id, url: override.imageUrl }]
          : [],
      },
      pharmacy: {
        fixedProductId: null,
        fixedSubcategoryId: null,
        fixedCategoryId: null,
        isFixedBase: false,
      },
    };
  }
}

export const pharmacyProfileCatalogService =
  new PharmacyProfileCatalogService();
