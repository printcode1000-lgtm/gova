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

export class ProductService {
  constructor(private repository: ProductRepository = productRepository) {}

  async get(id: string): Promise<ProductRecord> {
    if (!SAFE_ID.test(id)) throw new Error("invalidProduct");
    const product = await this.repository.findById(id);
    if (!product || product.status === "archived")
      throw new Error("productNotFound");
    return product;
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
    return this.repository.create({
      id: randomUUID(),
      uid: input.uid,
      mainCategoryId: input.mainCategoryId,
      subcategoryId: input.subcategoryId,
      data: normalizeData(input.data),
      status: normalizeStatus(input.status),
      createdAt: now,
      updatedAt: now,
    });
  }

  async update(input: UpdateProductInput): Promise<ProductRecord> {
    const existing = await this.get(input.id);
    if (!input.uid || existing.uid !== input.uid)
      throw new Error("productForbidden");
    const updated = await this.repository.update(
      input.id,
      input.uid,
      normalizeData(input.data),
      normalizeStatus(input.status ?? existing.status),
      new Date().toISOString(),
    );
    if (!updated) throw new Error("productNotFound");
    return updated;
  }
}

export const productService = new ProductService();
