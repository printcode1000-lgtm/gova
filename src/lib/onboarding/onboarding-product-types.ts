import type { StoredImage } from '@asol/storage-core';

import type { UploadedImage } from './onboarding-upload-types';

export interface ProductVariant {
  id: string;
  sku: string;
  size: string;
  color: string;
  material: string;
  price: number;
  discountPrice: number | null;
  inventory: number;
  images: UploadedImage[];
}

export interface Product {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  tags: string[];
  basePrice: number;
  discountPrice: number | null;
  image: StoredImage | null;
  variants: ProductVariant[];
  isActive: boolean;
  isFeatured: boolean;
}

export interface ProductsInfo {
  products: Product[];
  draftProducts: Product[];
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  coverImage: StoredImage | null;
  productIds: string[];
  isActive: boolean;
  isFeatured: boolean;
}

export interface CollectionsInfo {
  collections: Collection[];
}
