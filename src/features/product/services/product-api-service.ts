import { GOVA_API_ROUTES, govaApi, type GovaApiRequestOptions } from "@/core/api";
import type {
  CreateProductInput,
  ProductRecord,
  UpdateProductInput,
} from "../entities/product.entity";

export const productApiService = {
  get(id: string, options: GovaApiRequestOptions = {}) {
    return govaApi.get<ProductRecord>(
      `${GOVA_API_ROUTES.products}?id=${encodeURIComponent(id)}`,
      { cache: "no-store", ...options },
    );
  },
  listByOwnerAndCategory(uid: string, mainCategoryId: string, subcategoryId: string) {
    const query = new URLSearchParams({ uid, mainCategoryId, subcategoryId });
    return govaApi.get<ProductRecord[]>(
      `${GOVA_API_ROUTES.products}?${query.toString()}`,
      { cache: "no-store" },
    );
  },
  create(input: CreateProductInput) {
    return govaApi.post<ProductRecord>(GOVA_API_ROUTES.products, input);
  },
  update(input: UpdateProductInput) {
    return govaApi.put<ProductRecord>(GOVA_API_ROUTES.products, input);
  },
  delete(id: string, uid: string) {
    const query = new URLSearchParams({ id, uid });
    return govaApi.delete<{ deleted: true }>(
      `${GOVA_API_ROUTES.products}?${query.toString()}`,
    );
  },
};
