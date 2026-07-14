import "server-only";

import type { ProductRecord } from "@/features/product/entities/product.entity";
import type { ProductDetails } from "@/features/product/entities/product.entity";
import { createEmptyProductDetails } from "@/features/product/entities/product.entity";
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
} from "../entities/pharmacy-profile-catalog.types";
import { pharmacyStaticCatalogService } from "./pharmacy-static-catalog.service";
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
    const product = pharmacyStaticCatalogService.getCategories()
      .flatMap((category) =>
        pharmacyStaticCatalogService.getSubcategories(category.id).flatMap((subcategory) =>
          pharmacyStaticCatalogService.getActiveIngredients(subcategory.id)
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
    const categoryOverrides = await pharmacyProfileCatalogRepository.listCategoryOverrides(uid);
    const subcategoryOverrides = await pharmacyProfileCatalogRepository.listSubcategoryOverrides(uid);
    const hiddenCategoryIds = new Set(
      categoryOverrides
        .filter((item) => item.fixedCategoryId !== null && item.status === "hidden")
        .map((item) => item.fixedCategoryId!),
    );
    const hiddenSubcategoryIds = new Set(
      subcategoryOverrides
        .filter((item) => item.fixedSubcategoryId !== null && item.status === "hidden")
        .map((item) => item.fixedSubcategoryId!),
    );
    const overridesByFixedId = overrideByFixedId(overrides);
    const products: ProductRecord[] = [];

    for (const category of pharmacyStaticCatalogService.getCategories()) {
      if (hiddenCategoryIds.has(category.id)) continue;
      for (const subcategory of pharmacyStaticCatalogService.getSubcategories(category.id)) {
        if (hiddenSubcategoryIds.has(subcategory.id)) continue;
        for (const activeIngredient of pharmacyStaticCatalogService.getActiveIngredients(
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

  async getCatalogView(uid: string, includeHidden = false): Promise<PharmacyProfileCatalogView> {
    const categoryOverrides = await pharmacyProfileCatalogRepository.listCategoryOverrides(uid);
    const subcategoryOverrides = await pharmacyProfileCatalogRepository.listSubcategoryOverrides(uid);
    const categoryByFixedId = new Map(
      categoryOverrides
        .filter((item) => item.fixedCategoryId !== null)
        .map((item) => [item.fixedCategoryId!, item]),
    );
    const subcategoryByFixedId = new Map(
      subcategoryOverrides
        .filter((item) => item.fixedSubcategoryId !== null)
        .map((item) => [item.fixedSubcategoryId!, item]),
    );

    const categories: PharmacyProfileCatalogCategoryView[] = pharmacyStaticCatalogService.getCategories()
      .map((category) => {
        const override = categoryByFixedId.get(category.id);
        return {
          id: String(category.id),
          fixedCategoryId: category.id,
          nameAr: override?.nameAr || category.nameAr,
          nameEn: override?.nameEn || category.nameEn,
          icon: override?.icon || category.icon,
          status: override?.status ?? "visible" as const,
          sortOrder: fixedSort(override?.sortOrder ?? null, category.id),
          isCustom: false,
        };
      })
      .filter((item) => includeHidden || item.status !== "hidden");

    for (const override of categoryOverrides.filter((item) => item.fixedCategoryId === null)) {
      if (!includeHidden && override.status === "hidden") continue;
      categories.push({
        id: override.id,
        fixedCategoryId: null,
        nameAr: override.nameAr || "ØªØµÙ†ÙŠÙ ØµÙŠØ¯Ù„ÙŠØ©",
        nameEn: override.nameEn || override.nameAr || "Pharmacy category",
        icon: override.icon || "fas fa-pills",
        status: override.status,
        sortOrder: override.sortOrder ?? Number.MAX_SAFE_INTEGER,
        isCustom: true,
      });
    }

    const subcategories: PharmacyProfileCatalogSubcategoryView[] = pharmacyStaticCatalogService.getCategories()
      .flatMap((category) =>
        pharmacyStaticCatalogService.getSubcategories(category.id).map((subcategory) => {
          const override = subcategoryByFixedId.get(subcategory.id);
          return {
            id: String(subcategory.id),
            fixedSubcategoryId: subcategory.id,
            parentCategoryId: String(category.id),
            nameAr: override?.nameAr || subcategory.nameAr,
            nameEn: override?.nameEn || subcategory.nameEn,
            status: override?.status ?? "visible" as const,
            sortOrder: fixedSort(override?.sortOrder ?? null, subcategory.id),
            isCustom: false,
          };
        }),
      )
      .filter((item) => includeHidden || item.status !== "hidden");

    for (const override of subcategoryOverrides.filter((item) => item.fixedSubcategoryId === null)) {
      if (!includeHidden && override.status === "hidden") continue;
      subcategories.push({
        id: override.id,
        fixedSubcategoryId: null,
        parentCategoryId: override.parentCategoryId,
        nameAr: override.nameAr || "ØªØµÙ†ÙŠÙ ÙØ±Ø¹ÙŠ",
        nameEn: override.nameEn || override.nameAr || "Pharmacy subcategory",
        status: override.status,
        sortOrder: override.sortOrder ?? Number.MAX_SAFE_INTEGER,
        isCustom: true,
      });
    }

    const productOverrides = await pharmacyProfileCatalogRepository.listProductOverrides(uid);
    const productByFixedId = overrideByFixedId(productOverrides);
    const hiddenCategoryIds = new Set(
      categories.filter((item) => item.fixedCategoryId !== null && item.status === "hidden").map((item) => item.fixedCategoryId!),
    );
    const hiddenSubcategoryIds = new Set(
      subcategories.filter((item) => item.fixedSubcategoryId !== null && item.status === "hidden").map((item) => item.fixedSubcategoryId!),
    );
    const products: PharmacyProfileCatalogProductView[] = pharmacyStaticCatalogService.getCategories()
      .flatMap((category) => {
        if (!includeHidden && hiddenCategoryIds.has(category.id)) return [];
        return pharmacyStaticCatalogService.getSubcategories(category.id).flatMap((subcategory) => {
          if (!includeHidden && hiddenSubcategoryIds.has(subcategory.id)) return [];
          return pharmacyStaticCatalogService.getActiveIngredients(subcategory.id).map((activeIngredient) => {
            const override = productByFixedId.get(activeIngredient.originalId);
            return {
              id: encodePharmacyFixedProductId(uid, activeIngredient.originalId),
              fixedProductId: activeIngredient.originalId,
              parentSubcategoryId: String(subcategory.id),
              nameAr: override?.nameAr || activeIngredient.nameAr,
              nameEn: override?.nameEn || activeIngredient.nameEn,
              imageUrl: override?.imageUrl || imageUrl(activeIngredient.imageUrl),
              status: override?.status ?? "visible",
              sortOrder: activeIngredient.originalId,
              isCustom: false,
            };
          });
        });
      })
      .filter((item) => includeHidden || item.status !== "hidden")
      .sort((left, right) => left.sortOrder - right.sortOrder);

    for (const override of productOverrides.filter((item) => item.fixedProductId === null)) {
      if (!includeHidden && override.status === "hidden") continue;
      products.push({
        id: override.id,
        fixedProductId: null,
        parentSubcategoryId: override.parentSubcategoryId,
        nameAr: override.nameAr || "Ù…Ù†ØªØ¬ ØµÙŠØ¯Ù„ÙŠØ©",
        nameEn: override.nameEn || override.nameAr || "Pharmacy product",
        imageUrl: override.imageUrl || "",
        status: override.status,
        sortOrder: override.sortOrder ?? Number.MAX_SAFE_INTEGER,
        isCustom: true,
      });
    }

    return {
      categories: categories.sort((left, right) => left.sortOrder - right.sortOrder),
      subcategories: subcategories.sort((left, right) => left.sortOrder - right.sortOrder),
      products,
    };
  }

  async createCategory(uid: string, nameAr: string, nameEn?: string) {
    return pharmacyProfileCatalogRepository.createCustomCategory({ uid, nameAr, nameEn });
  }

  async createSubcategory(uid: string, parentCategoryId: string, nameAr: string, nameEn?: string) {
    return pharmacyProfileCatalogRepository.createCustomSubcategory({
      uid,
      parentCategoryId,
      nameAr,
      nameEn,
    });
  }

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

  private toProductRecord(
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

export const pharmacyProfileCatalogService =
  new PharmacyProfileCatalogService();

