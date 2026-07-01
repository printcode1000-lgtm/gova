import type { StoredImage } from "@/core/storage/types/stored-image.types";

export type ProductStatus = "draft" | "active" | "archived";
export type ProductFieldValues = Record<string, string>;

export interface ProductData {
  fields: ProductFieldValues;
  images: StoredImage[];
}

export interface ProductRecord {
  id: string;
  uid: string;
  mainCategoryId: string;
  subcategoryId: string;
  data: ProductData;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  uid: string;
  mainCategoryId: string;
  subcategoryId: string;
  data: ProductData;
  status?: ProductStatus;
}

export interface UpdateProductInput {
  id: string;
  uid: string;
  data: ProductData;
  status?: ProductStatus;
}
