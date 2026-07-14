import "server-only";

import { productDbClient } from "@/core/database/product-db-client";
import {
  PRODUCT_COLUMNS,
  mapProductRow,
} from "@/features/product/repositories/product-repository";
import {
  getDefaultProductSearchFieldKeys,
  getProductSearchFieldByKey,
  getProductSearchFields,
} from "../config/product-search-fields";
import type {
  ProductSearchRequest,
  ProductSearchResult,
  ProductSearchSort,
} from "../entities/product-search.types";
import { normalizeSearchText } from "../utils/arabic-search";

const SORT_SQL: Record<ProductSearchSort, string> = {
  relevance: "created_at DESC",
  newest: "created_at DESC",
  oldest: "created_at ASC",
  name: "main_name COLLATE NOCASE ASC",
  price_asc:
    "CASE WHEN NULLIF(price_current, '') IS NULL THEN 1 ELSE 0 END ASC, CAST(price_current AS REAL) ASC",
  price_desc:
    "CASE WHEN NULLIF(price_current, '') IS NULL THEN 1 ELSE 0 END ASC, CAST(price_current AS REAL) DESC",
};

function selectedSearchColumns(request: ProductSearchRequest) {
  const configuredAllowed = request.allowedFieldKeys?.length
    ? request.allowedFieldKeys
    : getProductSearchFields(request.mainCategoryId, request.subcategoryId).map(
        (field) => field.key,
      );
  const allowed = new Set(configuredAllowed);
  const keys = request.fields.filter((key) => allowed.has(key));
  const normalizedKeys =
    keys.length > 0
      ? keys
      : getDefaultProductSearchFieldKeys(
          request.mainCategoryId,
          request.subcategoryId,
        ).filter((key) => allowed.has(key));
  return normalizedKeys
    .map((key) => getProductSearchFieldByKey(key)?.column)
    .filter((column): column is string => Boolean(column));
}

function normalizedColumnSql(column: string) {
  return `lower(replace(replace(replace(${column}, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'))`;
}

export class ProductSearchRepository {
  async search(request: ProductSearchRequest): Promise<ProductSearchResult> {
    const limit = Math.min(60, Math.max(1, request.limit ?? 24));
    const offset = Math.max(0, request.offset ?? 0);
    const where: string[] = [
      "main_category_id = ?",
      "subcategory_id = ?",
      request.includeDrafts ? "status != 'archived'" : "status = 'active'",
    ];
    const params: Array<string | number> = [
      request.mainCategoryId,
      request.subcategoryId,
    ];

    if (request.ownerUid) {
      where.push("uid = ?");
      params.push(request.ownerUid);
    }

    const search = normalizeSearchText(request.q ?? "");
    const searchColumns = selectedSearchColumns(request);
    if (search && searchColumns.length > 0) {
      const pattern = `%${search}%`;
      where.push(
        `(${searchColumns
          .map((column) => `${normalizedColumnSql(column)} LIKE ?`)
          .join(" OR ")})`,
      );
      params.push(...searchColumns.map(() => pattern));
    }

    const filters = request.filters ?? {};
    if (filters.availableOnly) where.push("main_available = 1");
    if (filters.needsCar) where.push("price_needs_car = 1");
    if (filters.status && request.includeDrafts) {
      where.push("status = ?");
      params.push(filters.status);
    }
    if (filters.minRating) {
      where.push("NULLIF(rating_value, '') IS NOT NULL");
      where.push("CAST(rating_value AS REAL) >= ?");
      params.push(Number(filters.minRating));
    }

    const whereSql = where.join(" AND ");
    const sort = SORT_SQL[request.sort ?? "newest"] ?? SORT_SQL.newest;
    const rows = await productDbClient.execute(
      `SELECT ${PRODUCT_COLUMNS.join(", ")} FROM products WHERE ${whereSql} ORDER BY ${sort} LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    const totalRows = (await productDbClient.execute(
      `SELECT COUNT(*) AS total FROM products WHERE ${whereSql}`,
      params,
    )) as Array<{ total: number }>;
    return {
      items: (rows as Parameters<typeof mapProductRow>[0][]).map(mapProductRow),
      total: Number(totalRows[0]?.total ?? 0),
      offset,
      limit,
    };
  }
}

export const productSearchRepository = new ProductSearchRepository();
