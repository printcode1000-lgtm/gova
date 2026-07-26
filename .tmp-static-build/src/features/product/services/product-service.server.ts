import "server-only";

import { randomUUID } from "node:crypto";
import type {
  CreateProductInput,
  ProductDetails,
  ProductRecord,
  ProductStatus,
  UpdateProductInput,
} from "../entities/product.entity";
import { createEmptyProductDetails } from "../entities/product.entity";
import {
  productRepository,
  type ProductRepository,
} from "../repositories/product-repository";
import { categoryService } from "@/features/categories";
import { imageStorageService } from "@/features/storage/services/image-storage-service.bootstrap.server";
import { pharmacyProfileCatalogService } from "@/features/pharmacy-profile-catalog/services/pharmacy-profile-catalog.service.server";

const SAFE_ID = /^[a-z0-9-]+$/i;

function clean(value: unknown, max = 10000) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function normalizeDetails(value: ProductDetails): ProductDetails {
  const details = createEmptyProductDetails(value);
  const images = Array.isArray(value?.images)
    ? value.images
        .filter(
          (image) =>
            image &&
            typeof image.imageKey === "string" &&
            typeof image.url === "string",
        )
        .slice(0, 20)
    : [];
  return createEmptyProductDetails({
    ...details,
    mainData: {
      name: clean(details.mainData.name),
      brand: clean(details.mainData.brand),
      manufacturer: clean(details.mainData.manufacturer),
      available: details.mainData.available === true,
      description: clean(details.mainData.description),
    },
    price: {
      current: clean(details.price.current, 120),
      beforeDiscount: clean(details.price.beforeDiscount, 120),
      label: clean(details.price.label, 500),
      needsCar: details.price.needsCar === true,
    },
    pharmacySpecs: {
      ...details.pharmacySpecs,
      prescriptionRequired: details.pharmacySpecs.prescriptionRequired === true,
    },
    rating: {
      rating: clean(details.rating.rating, 120),
      comment: clean(details.rating.comment),
      enabled: details.rating.enabled !== false,
      targetEnabled: details.rating.targetEnabled !== false,
      mode:
        details.rating.mode === "stars" ||
        details.rating.mode === "stars-comments"
          ? details.rating.mode
          : "",
    },
    images,
  });
}

function normalizeStatus(value: ProductStatus | undefined): ProductStatus {
  return value === "draft" || value === "archived" ? value : "active";
}

async function deleteProductImages(imageKeys: string[]): Promise<void> {
  const results = await Promise.allSettled(
    [...new Set(imageKeys)].map((imageKey) =>
      imageStorageService.deleteImage("product-default", imageKey),
    ),
  );
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Product image cleanup failed after database commit:", result.reason);
    }
  }
}

export class ProductService {
  constructor(private repository: ProductRepository = productRepository) {}

  async get(id: string): Promise<ProductRecord> {
    const pharmacyProduct = await pharmacyProfileCatalogService.getProduct(id);
    if (pharmacyProduct) return pharmacyProduct;
    if (!SAFE_ID.test(id)) throw new Error("invalidProduct");
    const product = await this.repository.findById(id);
    if (!product || product.status === "archived")
      throw new Error("productNotFound");
    return product;
  }

  async listByOwnerAndCategory(
    uid: string,
    mainCategoryId: string,
    subcategoryId: string,
  ): Promise<ProductRecord[]> {
    if (
      !uid ||
      !SAFE_ID.test(mainCategoryId) ||
      !SAFE_ID.test(subcategoryId) ||
      !categoryService.resolveLegacyProductSelection(mainCategoryId, subcategoryId).valid
    ) {
      throw new Error("invalidProduct");
    }
    const products = await this.repository.findByOwnerAndCategory(uid, mainCategoryId, subcategoryId);
    if (pharmacyProfileCatalogService.isPharmacyProductBucket(mainCategoryId, subcategoryId)) {
      const pharmacyProducts = await pharmacyProfileCatalogService.listProducts(uid);
      const productIds = new Set(products.map((product) => product.id));
      return [
        ...pharmacyProducts.filter((product) => !productIds.has(product.id)),
        ...products,
      ];
    }
    return products;
  }

  async create(input: CreateProductInput): Promise<ProductRecord> {
    if (
      !input.uid ||
      !SAFE_ID.test(input.mainCategoryId) ||
      !SAFE_ID.test(input.subcategoryId)
    )
      throw new Error("invalidProduct");
    const categorySelection = categoryService.resolveLegacyProductSelection(
      input.mainCategoryId,
      input.subcategoryId,
    );
    if (!categorySelection.valid) throw new Error("invalidCategorySelection");
    const now = new Date().toISOString();
    const normalizedDetails = normalizeDetails(input);
    return this.repository.create({
      id: randomUUID(),
      uid: input.uid,
      mainCategoryId: input.mainCategoryId,
      subcategoryId: input.subcategoryId,
      ...normalizedDetails,
      status: normalizeStatus(input.status),
      createdAt: now,
      updatedAt: now,
    });
  }

  async update(input: UpdateProductInput): Promise<ProductRecord> {
    const fixedPharmacyProduct = await pharmacyProfileCatalogService.updateFixedProduct(
      input.id,
      input.uid,
      normalizeDetails(input),
    );
    if (fixedPharmacyProduct) return fixedPharmacyProduct;
    const existing = await this.get(input.id);
    if (!input.uid || existing.uid !== input.uid)
      throw new Error("productForbidden");
    const normalizedDetails = normalizeDetails(input);
    const updated = await this.repository.update(
      input.id,
      input.uid,
      normalizedDetails,
      normalizeStatus(input.status ?? existing.status),
      new Date().toISOString(),
    );
    if (!updated) throw new Error("productNotFound");
    const retainedKeys = new Set(normalizedDetails.images.map((image) => image.imageKey));
    const removedKeys = existing.images
      .map((image) => image.imageKey)
      .filter((imageKey) => !retainedKeys.has(imageKey));
    await deleteProductImages(removedKeys);
    return updated;
  }

  async delete(id: string, uid: string): Promise<void> {
    if (await pharmacyProfileCatalogService.hideFixedProduct(id, uid)) return;
    const existing = await this.get(id);
    if (!uid || existing.uid !== uid) throw new Error("productForbidden");
    const deleted = await this.repository.delete(id, uid);
    if (!deleted) throw new Error("productNotFound");
    await deleteProductImages(existing.images.map((image) => image.imageKey));
  }
}

export const productService = new ProductService();
