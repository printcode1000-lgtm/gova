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

export abstract class PharmacyProfileCatalogPart1 {
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

  abstract updateCategory(uid: string, categoryId: string, nameAr: string, nameEn?: string): any;

  abstract updateSubcategory(uid: string, subcategoryId: string, parentCategoryId: string, nameAr: string, nameEn?: string): any;

  abstract setCategoryStatus(uid: string, categoryId: string, status: PharmacyOverrideStatus): any;

  abstract setSubcategoryStatus(uid: string, subcategoryId: string, parentCategoryId: string, status: PharmacyOverrideStatus): any;

  abstract setProductStatus(uid: string, productId: string, status: PharmacyOverrideStatus): any;

  abstract updateFixedProduct(productId: string, uid: string, details: ProductDetails): Promise<ProductRecord | null>;

  abstract hideFixedProduct(productId: string, uid: string): Promise<boolean>;

  protected abstract toProductRecord(uid: string, source: {
    category: ReturnType<typeof pharmacyStaticCatalogService.getCategories>[number];
    subcategory: ReturnType<typeof pharmacyStaticCatalogService.getSubcategories>[number];
    activeIngredient: ReturnType<typeof pharmacyStaticCatalogService.getActiveIngredients>[number];
}, override?: PharmacyProfileProductOverride | null): PharmacyProfileProduct;

  protected abstract customOverrideToProductRecord(uid: string, override: PharmacyProfileProductOverride): PharmacyProfileProduct;
}
