import { GOVA_API_ROUTES, govaApi } from "@/core/api";
import type {
  CreateProductInput,
  ProductRecord,
  UpdateProductInput,
} from "../entities/product.entity";

export const productApiService = {
  get(id: string) {
    return govaApi.get<ProductRecord>(
      `${GOVA_API_ROUTES.products}?id=${encodeURIComponent(id)}`,
      { cache: "no-store" },
    );
  },
  create(input: CreateProductInput) {
    return govaApi.post<ProductRecord>(GOVA_API_ROUTES.products, input);
  },
  update(input: UpdateProductInput) {
    return govaApi.put<ProductRecord>(GOVA_API_ROUTES.products, input);
  },
};
