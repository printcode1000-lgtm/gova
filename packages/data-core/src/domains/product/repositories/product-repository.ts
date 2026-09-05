import { productsDataSource, profilesDataSource } from "../../../core";
import "server-only";

import {
  mergeProductRecord,
  mapProductRow,
  MUTABLE_PRODUCT_COLUMNS,
  PRODUCT_COLUMNS,
  productRowValues,
  type ProductRow,
} from "./product-persistence";
import type {
  ProductDetails,
  ProductRecord,
  ProductStatus,
} from "@asol/product-core";
import {
  productSelectColumns,
  productTableColumnNames,
} from "./product-select-columns";

export {
  mapProductRow,
  PRODUCT_COLUMNS,
} from "./product-persistence";

export class ProductRepository {
  private async productTableColumns(): Promise<Set<string>> {
    const columnRows = await productsDataSource.execute("PRAGMA table_info(products)");
    return productTableColumnNames(columnRows);
  }

  async findById(id: string): Promise<ProductRecord | null> {
    const existingColumns = await this.productTableColumns();
    const columns = productSelectColumns(existingColumns);
    const rows = (await productsDataSource.execute(
      `SELECT ${columns} FROM products WHERE id = ? LIMIT 1`,
      [id],
    )) as ProductRow[];
    return rows[0] ? mapProductRow(rows[0]) : null;
  }

  async findByOwnerAndCategory(
    uid: string,
    mainCategoryId: string,
    subcategoryId: string,
  ): Promise<ProductRecord[]> {
    const existingColumns = await this.productTableColumns();
    const columns = productSelectColumns(existingColumns);
    const statusFilter = existingColumns.has("status") ? " AND status != 'archived'" : "";
    const orderColumn = existingColumns.has("created_at") ? "created_at" : "id";
    const rows = (await productsDataSource.execute(
      `SELECT ${columns} FROM products WHERE uid = ? AND main_category_id = ? AND subcategory_id = ?${statusFilter} ORDER BY ${orderColumn} DESC`,
      [uid, mainCategoryId, subcategoryId],
    )) as ProductRow[];
    return rows.map(mapProductRow);
  }

  async create(record: ProductRecord): Promise<ProductRecord> {
    await productsDataSource.execute(
      `INSERT INTO products (${PRODUCT_COLUMNS.join(", ")}) VALUES (${PRODUCT_COLUMNS.map(() => "?").join(", ")})`,
      productRowValues(record),
    );
    await refreshProfileProductCounts(record.uid);
    return record;
  }

  async update(
    id: string,
    uid: string,
    details: ProductDetails,
    status: ProductStatus,
    updatedAt: string,
  ): Promise<ProductRecord | null> {
    const existing = await this.findById(id);
    if (!existing || existing.uid !== uid) return null;
    const next = mergeProductRecord(existing, details, status, updatedAt);
    const assignments = MUTABLE_PRODUCT_COLUMNS.map((column) => `${column} = ?`).join(
      ", ",
    );
    const values = productRowValues(next).filter(
      (_value, index) =>
        ![
          "id",
          "uid",
          "main_category_id",
          "subcategory_id",
          "created_at",
        ].includes(PRODUCT_COLUMNS[index] ?? ""),
    );
    await productsDataSource.execute(
      `UPDATE products SET ${assignments} WHERE id = ? AND uid = ?`,
      [...values, id, uid],
    );
    await refreshProfileProductCounts(uid);
    return this.findById(id);
  }

  async delete(id: string, uid: string): Promise<boolean> {
    await productsDataSource.execute("DELETE FROM products WHERE id = ? AND uid = ?", [
      id,
      uid,
    ]);
    await refreshProfileProductCounts(uid);
    return (await this.findById(id)) === null;
  }
}

async function refreshProfileProductCounts(uid: string): Promise<void> {
  const rows = (await productsDataSource.execute(
    `SELECT main_category_id category_id,
            subcategory_id subcategory_id,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) active_count,
            SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) draft_count,
            SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) archived_count
     FROM products
     WHERE uid = ?
       AND COALESCE(pharmacy_catalog_kind, '') != 'fixed'
     GROUP BY main_category_id, subcategory_id`,
    [uid],
  )) as Array<{
    category_id: string;
    subcategory_id: string;
    active_count: number;
    draft_count: number;
    archived_count: number;
  }>;
  await profilesDataSource.execute(
    "DELETE FROM profile_category_product_counts WHERE uid = ?",
    [uid],
  );
  const timestamp = new Date().toISOString();
  for (const row of rows) {
    await profilesDataSource.execute(
      `INSERT INTO profile_category_product_counts
        (uid, category_id, subcategory_id, active_product_count, draft_product_count, archived_product_count, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        uid,
        row.category_id,
        row.subcategory_id,
        Number(row.active_count ?? 0),
        Number(row.draft_count ?? 0),
        Number(row.archived_count ?? 0),
        timestamp,
      ],
    );
  }
}

export const productRepository = new ProductRepository();
