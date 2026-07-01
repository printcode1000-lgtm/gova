import "server-only";

import { productDbClient } from "@/core/database/product-db-client";
import type {
  ProductData,
  ProductRecord,
  ProductStatus,
} from "../entities/product.entity";

interface ProductRow {
  id: string;
  uid: string;
  main_category_id: string;
  subcategory_id: string;
  data_json: string;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
}

function parseData(value: string): ProductData {
  try {
    const data = JSON.parse(value) as ProductData;
    return {
      fields:
        data?.fields && typeof data.fields === "object" ? data.fields : {},
      images: Array.isArray(data?.images) ? data.images : [],
    };
  } catch {
    return { fields: {}, images: [] };
  }
}

function mapRow(row: ProductRow): ProductRecord {
  return {
    id: row.id,
    uid: row.uid,
    mainCategoryId: row.main_category_id,
    subcategoryId: row.subcategory_id,
    data: parseData(row.data_json),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ProductRepository {
  async findById(id: string): Promise<ProductRecord | null> {
    const rows = (await productDbClient.execute(
      "SELECT * FROM products WHERE id = ? LIMIT 1",
      [id],
    )) as ProductRow[];
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async create(record: ProductRecord): Promise<ProductRecord> {
    await productDbClient.execute(
      "INSERT INTO products (id, uid, main_category_id, subcategory_id, data_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        record.id,
        record.uid,
        record.mainCategoryId,
        record.subcategoryId,
        JSON.stringify(record.data),
        record.status,
        record.createdAt,
        record.updatedAt,
      ],
    );
    return record;
  }

  async update(
    id: string,
    uid: string,
    data: ProductData,
    status: ProductStatus,
    updatedAt: string,
  ): Promise<ProductRecord | null> {
    await productDbClient.execute(
      "UPDATE products SET data_json = ?, status = ?, updated_at = ? WHERE id = ? AND uid = ?",
      [JSON.stringify(data), status, updatedAt, id, uid],
    );
    return this.findById(id);
  }
}

export const productRepository = new ProductRepository();
