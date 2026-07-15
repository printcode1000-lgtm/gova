import { ASOL_API_ROUTES, asolApi, type AsolApiRequestOptions } from "@/core/api";
import type {
  CreateProductInput,
  ProductRecord,
  UpdateProductInput,
} from "../entities/product.entity";

export const productApiService = {
  get(id: string, options: AsolApiRequestOptions = {}) {
    return asolApi.get<ProductRecord>(
      `${ASOL_API_ROUTES.products}?id=${encodeURIComponent(id)}`,
      { cache: "no-store", ...options },
    );
  },
  listByOwnerAndCategory(uid: string, mainCategoryId: string, subcategoryId: string) {
    const query = new URLSearchParams({ uid, mainCategoryId, subcategoryId });
    return asolApi.get<ProductRecord[]>(
      `${ASOL_API_ROUTES.products}?${query.toString()}`,
      { cache: "no-store" },
    );
  },
  create(input: CreateProductInput) {
    return asolApi.post<ProductRecord>(ASOL_API_ROUTES.products, input);
  },
  update(input: UpdateProductInput) {
    return asolApi.put<ProductRecord>(ASOL_API_ROUTES.products, input);
  },
  delete(id: string, uid: string) {
    const query = new URLSearchParams({ id, uid });
    return asolApi.delete<{ deleted: true }>(
      `${ASOL_API_ROUTES.products}?${query.toString()}`,
    );
  },
};
