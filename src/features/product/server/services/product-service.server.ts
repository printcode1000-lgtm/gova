import "server-only";

import { randomUUID } from "node:crypto";
import {
  createEmptyProductDetails,
  isSafeProductId,
  normalizeProductDetails,
  normalizeProductStatus,
  type CreateProductInput,
  type ProductImage,
  type ProductRecord,
  type UpdateProductInput,
} from "@asol/product-core";
import {
  productRepository,
  type ProductRepository,
} from "@asol/data-core/product";
import { StorageProfiles } from "@asol/storage-core";
import { categoryService } from "@/features/categories";
import { imageStorageService } from "@/features/storage/server";
import { pharmacyProfileCatalogService } from "@/features/pharmacy-profile-catalog/server";

function resolveStoredProductImageProfileId(image: ProductImage): string {
  // Legacy rows omit storageProfileId and live on the original product bucket.
  return image.storageProfileId || StorageProfiles.ProductDefault;
}

async function deleteProductImages(images: ProductImage[]): Promise<void> {
  const unique = new Map<string, ProductImage>();
  for (const image of images) {
    if (!image.imageKey) continue;
    unique.set(
      `${resolveStoredProductImageProfileId(image)}:${image.imageKey}`,
      image,
    );
  }
  const results = await Promise.allSettled(
    [...unique.values()].map((image) =>
      imageStorageService.deleteImage(
        resolveStoredProductImageProfileId(image),
        image.imageKey,
      ),
    ),
  );
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Product image cleanup failed after database commit:", result.reason);
    }
  }
}

function withImageUrls(product: ProductRecord): ProductRecord {
  return {
    ...product,
    images: product.images.map((image) => ({
      ...image,
      url: imageStorageService.resolveImageUrl(
        resolveStoredProductImageProfileId(image),
        image.imageKey,
      ),
    })),
  };
}

export class ProductService {
  constructor(private repository: ProductRepository = productRepository) {}

  async get(id: string): Promise<ProductRecord> {
    const pharmacyProduct = await pharmacyProfileCatalogService.getProduct(id);
    if (pharmacyProduct) return pharmacyProduct;
    if (!isSafeProductId(id)) throw new Error("invalidProduct");
    const product = await this.repository.findById(id);
    if (!product || product.status === "archived")
      throw new Error("productNotFound");
    return withImageUrls(product);
  }

  async listByOwnerAndCategory(
    uid: string,
    mainCategoryId: string,
    subcategoryId: string,
  ): Promise<ProductRecord[]> {
    if (
      !uid ||
      !isSafeProductId(mainCategoryId) ||
      !isSafeProductId(subcategoryId) ||
      !categoryService.resolveProductSelection(mainCategoryId, subcategoryId).valid
    ) {
      throw new Error("invalidProduct");
    }
    const products = await this.repository.findByOwnerAndCategory(uid, mainCategoryId, subcategoryId);
    if (pharmacyProfileCatalogService.isPharmacyProductBucket(mainCategoryId, subcategoryId)) {
      const pharmacyProducts = await pharmacyProfileCatalogService.listProducts(uid);
      const productIds = new Set(products.map((product) => product.id));
      return [
        ...pharmacyProducts.filter((product) => !productIds.has(product.id)),
        ...products.map(withImageUrls),
      ];
    }
    return products.map(withImageUrls);
  }

  async create(input: CreateProductInput): Promise<ProductRecord> {
    if (
      !input.uid ||
      !isSafeProductId(input.mainCategoryId) ||
      !isSafeProductId(input.subcategoryId)
    )
      throw new Error("invalidProduct");
    const categorySelection = categoryService.resolveProductSelection(
      input.mainCategoryId,
      input.subcategoryId,
    );
    if (!categorySelection.valid) throw new Error("invalidCategorySelection");
    const now = new Date().toISOString();
    const normalizedDetails = normalizeProductDetails(input);
    return this.repository.create({
      id: randomUUID(),
      uid: input.uid,
      mainCategoryId: input.mainCategoryId,
      subcategoryId: input.subcategoryId,
      ...normalizedDetails,
      status: normalizeProductStatus(input.status),
      createdAt: now,
      updatedAt: now,
    });
  }

  async update(input: UpdateProductInput): Promise<ProductRecord> {
    const fixedPharmacyProduct = await pharmacyProfileCatalogService.updateFixedProduct(
      input.id,
      input.uid,
      normalizeProductDetails(input),
    );
    if (fixedPharmacyProduct) return fixedPharmacyProduct;
    const existing = await this.get(input.id);
    if (!input.uid || existing.uid !== input.uid)
      throw new Error("productForbidden");
    const normalizedDetails = normalizeProductDetails(input);
    const updated = await this.repository.update(
      input.id,
      input.uid,
      normalizedDetails,
      normalizeProductStatus(input.status ?? existing.status),
      new Date().toISOString(),
    );
    if (!updated) throw new Error("productNotFound");
    const retainedKeys = new Set(normalizedDetails.images.map((image) => image.imageKey));
    const removedImages = existing.images.filter(
      (image) => !retainedKeys.has(image.imageKey),
    );
    await deleteProductImages(removedImages);
    return updated;
  }

  async delete(id: string, uid: string): Promise<void> {
    if (await pharmacyProfileCatalogService.hideFixedProduct(id, uid)) return;
    const existing = await this.get(id);
    if (!uid || existing.uid !== uid) throw new Error("productForbidden");
    const deleted = await this.repository.delete(id, uid);
    if (!deleted) throw new Error("productNotFound");
    await deleteProductImages(existing.images);
  }
}

export const productService = new ProductService();
