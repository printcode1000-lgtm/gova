import "server-only";

import { randomUUID } from "node:crypto";
import type {
  CreateProductInput,
  ProductData,
  ProductRecord,
  ProductStatus,
  UpdateProductInput,
} from "../entities/product.entity";
import {
  productRepository,
  type ProductRepository,
} from "../repositories/product-repository";
import { categoryService } from "@/features/categories";
import { imageStorageService } from "@/features/storage/services/image-storage-service.bootstrap.server";
import { pharmacyProfileCatalogService } from "@/features/pharmacy-profile-catalog/services/pharmacy-profile-catalog.service.server";

const SAFE_ID = /^[a-z0-9-]+$/i;

function normalizeData(value: ProductData): ProductData {
  const fields: Record<string, string> = {};
  if (value?.fields && typeof value.fields === "object") {
    for (const [key, fieldValue] of Object.entries(value.fields)) {
      if (/^[a-zA-Z0-9_.-]+$/.test(key) && typeof fieldValue === "string")
        fields[key] = fieldValue.slice(0, 10000);
    }
  }
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
  return { fields, images };
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
    const normalizedData = normalizeData(input.data);
    return this.repository.create({
      id: randomUUID(),
      uid: input.uid,
      mainCategoryId: input.mainCategoryId,
      subcategoryId: input.subcategoryId,
      data: normalizedData,
      status: normalizeStatus(input.status),
      createdAt: now,
      updatedAt: now,
    });
  }

  async update(input: UpdateProductInput): Promise<ProductRecord> {
    const fixedPharmacyProduct = await pharmacyProfileCatalogService.updateFixedProduct(
      input.id,
      input.uid,
      normalizeData(input.data),
    );
    if (fixedPharmacyProduct) return fixedPharmacyProduct;
    const existing = await this.get(input.id);
    if (!input.uid || existing.uid !== input.uid)
      throw new Error("productForbidden");
    const normalizedData = normalizeData(input.data);
    const updated = await this.repository.update(
      input.id,
      input.uid,
      normalizedData,
      normalizeStatus(input.status ?? existing.status),
      new Date().toISOString(),
    );
    if (!updated) throw new Error("productNotFound");
    const retainedKeys = new Set(normalizedData.images.map((image) => image.imageKey));
    const removedKeys = existing.data.images
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
    await deleteProductImages(existing.data.images.map((image) => image.imageKey));
  }
}

export const productService = new ProductService();
