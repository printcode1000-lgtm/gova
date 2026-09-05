import type { ProductRecord } from "@asol/product-core";
import type { ProfileDirectoryEntry } from "../../profile/entities/profile-directory-entry.entity";

export type ProductSearchMode = "products" | "sellers";

export type ProductSearchSort =
  | "relevance"
  | "newest"
  | "oldest"
  | "name"
  | "price_asc"
  | "price_desc";

export type SellerSearchSort = "relevance" | "name";

export type ProductSearchFieldGroup =
  | "basic"
  | "rating"
  | "specifications"
  | "vehicle"
  | "property"
  | "pharmacy";

export interface ProductSearchField {
  key: string;
  column: string;
  labelAr: string;
  labelEn: string;
  group: ProductSearchFieldGroup;
  componentKey:
    | "mainData"
    | "price"
    | "rating"
    | "specifications"
    | "vehicleSpecs"
    | "propertySpecs"
    | "pharmacySpecs";
  optionKey: string;
}

export interface ProductSearchFilters {
  availableOnly?: boolean;
  needsCar?: boolean;
  status?: "active" | "draft" | "archived" | "";
  minRating?: "1" | "2" | "3" | "4" | "";
}

export interface ProductSearchRequest {
  q?: string;
  ownerUid?: string;
  mainCategoryId: string;
  subcategoryId: string;
  fields: string[];
  filters?: ProductSearchFilters;
  sort?: ProductSearchSort;
  offset?: number;
  limit?: number;
  includeDrafts?: boolean;
  allowedFieldKeys?: string[];
}

export interface ProductSearchResult {
  items: ProductRecord[];
  total: number;
  offset: number;
  limit: number;
}

export interface SellerSearchRequest {
  q?: string;
  mainCategoryId: string;
  subcategoryId: string;
  offset?: number;
  limit?: number;
  sort?: SellerSearchSort;
  minRating?: "1" | "2" | "3" | "4" | "";
}

export interface SellerSearchResult {
  items: ProfileDirectoryEntry[];
  total: number;
  offset: number;
  limit: number;
}
