import "server-only";

import { productDbClient } from "@/core/database/product-db-client";
import { profileDbClient } from "@/core/database/profile-db-client";
import type { StoredImage } from "@/core/storage/types/stored-image.types";
import type {
  ProductDetails,
  ProductRatingMode,
  ProductRecord,
  ProductStatus,
} from "../entities/product.entity";
import { createEmptyProductDetails } from "../entities/product.entity";

interface ProductRow {
  id: string;
  uid: string;
  main_category_id: string;
  subcategory_id: string;
  main_name: string;
  main_brand: string;
  main_manufacturer: string;
  main_available: number | boolean;
  main_description: string;
  price_current: string;
  price_before_discount: string;
  price_label: string;
  price_needs_car: number | boolean;
  spec_color: string;
  spec_dimensions: string;
  spec_condition: string;
  spec_size: string;
  spec_weight: string;
  spec_year: string;
  vehicle_brand: string;
  vehicle_body_type: string;
  vehicle_fuel: string;
  vehicle_transmission: string;
  vehicle_special: string;
  property_area: string;
  property_rooms: string;
  property_bathrooms: string;
  property_type: string;
  property_address: string;
  property_latitude: string;
  property_longitude: string;
  property_finishing: string;
  pharmacy_catalog_kind: string;
  pharmacy_catalog_category_id: string;
  pharmacy_catalog_category_name_ar: string;
  pharmacy_catalog_category_name_en: string;
  pharmacy_catalog_subcategory_id: string;
  pharmacy_catalog_subcategory_name_ar: string;
  pharmacy_catalog_subcategory_name_en: string;
  pharmacy_catalog_fixed_product_id: string;
  pharmacy_category_id: string;
  pharmacy_category: string;
  pharmacy_subcategory_id: string;
  pharmacy_subcategory: string;
  pharmacy_active_ingredient_id: string;
  pharmacy_active_ingredient: string;
  pharmacy_name_ar: string;
  pharmacy_name_en: string;
  pharmacy_form_id: string;
  pharmacy_form: string;
  pharmacy_concentration_id: string;
  pharmacy_concentration: string;
  pharmacy_prescription_required: number | boolean;
  rating_value: string;
  rating_comment: string;
  rating_enabled: number | boolean;
  rating_target_enabled: number | boolean;
  rating_mode: string;
  images_json: string;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
}

export const PRODUCT_COLUMNS = [
  "id",
  "uid",
  "main_category_id",
  "subcategory_id",
  "main_name",
  "main_brand",
  "main_manufacturer",
  "main_available",
  "main_description",
  "price_current",
  "price_before_discount",
  "price_label",
  "price_needs_car",
  "spec_color",
  "spec_dimensions",
  "spec_condition",
  "spec_size",
  "spec_weight",
  "spec_year",
  "vehicle_brand",
  "vehicle_body_type",
  "vehicle_fuel",
  "vehicle_transmission",
  "vehicle_special",
  "property_area",
  "property_rooms",
  "property_bathrooms",
  "property_type",
  "property_address",
  "property_latitude",
  "property_longitude",
  "property_finishing",
  "pharmacy_catalog_kind",
  "pharmacy_catalog_category_id",
  "pharmacy_catalog_category_name_ar",
  "pharmacy_catalog_category_name_en",
  "pharmacy_catalog_subcategory_id",
  "pharmacy_catalog_subcategory_name_ar",
  "pharmacy_catalog_subcategory_name_en",
  "pharmacy_catalog_fixed_product_id",
  "pharmacy_category_id",
  "pharmacy_category",
  "pharmacy_subcategory_id",
  "pharmacy_subcategory",
  "pharmacy_active_ingredient_id",
  "pharmacy_active_ingredient",
  "pharmacy_name_ar",
  "pharmacy_name_en",
  "pharmacy_form_id",
  "pharmacy_form",
  "pharmacy_concentration_id",
  "pharmacy_concentration",
  "pharmacy_prescription_required",
  "rating_value",
  "rating_comment",
  "rating_enabled",
  "rating_target_enabled",
  "rating_mode",
  "images_json",
  "status",
  "created_at",
  "updated_at",
] as const;

const MUTABLE_COLUMNS = PRODUCT_COLUMNS.filter(
  (column) =>
    ![
      "id",
      "uid",
      "main_category_id",
      "subcategory_id",
      "created_at",
    ].includes(column),
);

function bool(value: number | boolean | null | undefined, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (value === 0 || value === 1) return value === 1;
  return fallback;
}

function text(value: string | null | undefined) {
  return typeof value === "string" ? value : "";
}

function parseImages(value: string): StoredImage[] {
  try {
    const images = JSON.parse(value) as StoredImage[];
    return Array.isArray(images)
      ? images.filter(
          (image) =>
            image &&
            typeof image.imageKey === "string" &&
            typeof image.url === "string",
        )
      : [];
  } catch {
    return [];
  }
}

function normalizedRatingMode(value: string): ProductRatingMode {
  return value === "stars" || value === "stars-comments" ? value : "";
}

export function mapProductRow(row: ProductRow): ProductRecord {
  return {
    id: row.id,
    uid: row.uid,
    mainCategoryId: row.main_category_id,
    subcategoryId: row.subcategory_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...createEmptyProductDetails({
      mainData: {
        name: text(row.main_name),
        brand: text(row.main_brand),
        manufacturer: text(row.main_manufacturer),
        available: bool(row.main_available, true),
        description: text(row.main_description),
      },
      price: {
        current: text(row.price_current),
        beforeDiscount: text(row.price_before_discount),
        label: text(row.price_label),
        needsCar: bool(row.price_needs_car, false),
      },
      specifications: {
        color: text(row.spec_color),
        dimensions: text(row.spec_dimensions),
        condition: text(row.spec_condition),
        size: text(row.spec_size),
        weight: text(row.spec_weight),
        year: text(row.spec_year),
      },
      vehicleSpecs: {
        brand: text(row.vehicle_brand),
        bodyType: text(row.vehicle_body_type),
        fuel: text(row.vehicle_fuel),
        transmission: text(row.vehicle_transmission),
        special: text(row.vehicle_special),
      },
      propertySpecs: {
        area: text(row.property_area),
        rooms: text(row.property_rooms),
        bathrooms: text(row.property_bathrooms),
        type: text(row.property_type),
        address: text(row.property_address),
        locationLatitude: text(row.property_latitude),
        locationLongitude: text(row.property_longitude),
        finishing: text(row.property_finishing),
      },
      pharmacyCatalog: {
        kind: text(row.pharmacy_catalog_kind),
        categoryId: text(row.pharmacy_catalog_category_id),
        categoryNameAr: text(row.pharmacy_catalog_category_name_ar),
        categoryNameEn: text(row.pharmacy_catalog_category_name_en),
        subcategoryId: text(row.pharmacy_catalog_subcategory_id),
        subcategoryNameAr: text(row.pharmacy_catalog_subcategory_name_ar),
        subcategoryNameEn: text(row.pharmacy_catalog_subcategory_name_en),
        fixedProductId: text(row.pharmacy_catalog_fixed_product_id),
      },
      pharmacySpecs: {
        pharmacyCategoryId: text(row.pharmacy_category_id),
        pharmacyCategory: text(row.pharmacy_category),
        pharmacySubcategoryId: text(row.pharmacy_subcategory_id),
        pharmacySubcategory: text(row.pharmacy_subcategory),
        activeIngredientId: text(row.pharmacy_active_ingredient_id),
        activeIngredient: text(row.pharmacy_active_ingredient),
        nameAr: text(row.pharmacy_name_ar),
        nameEn: text(row.pharmacy_name_en),
        formId: text(row.pharmacy_form_id),
        form: text(row.pharmacy_form),
        concentrationId: text(row.pharmacy_concentration_id),
        concentration: text(row.pharmacy_concentration),
        prescriptionRequired: bool(row.pharmacy_prescription_required, false),
      },
      rating: {
        rating: text(row.rating_value),
        comment: text(row.rating_comment),
        enabled: bool(row.rating_enabled, true),
        targetEnabled: bool(row.rating_target_enabled, true),
        mode: normalizedRatingMode(row.rating_mode),
      },
      images: parseImages(row.images_json),
    }),
  };
}

function rowValues(record: ProductRecord): unknown[] {
  return [
    record.id,
    record.uid,
    record.mainCategoryId,
    record.subcategoryId,
    record.mainData.name,
    record.mainData.brand,
    record.mainData.manufacturer,
    record.mainData.available ? 1 : 0,
    record.mainData.description,
    record.price.current,
    record.price.beforeDiscount,
    record.price.label,
    record.price.needsCar ? 1 : 0,
    record.specifications.color,
    record.specifications.dimensions,
    record.specifications.condition,
    record.specifications.size,
    record.specifications.weight,
    record.specifications.year,
    record.vehicleSpecs.brand,
    record.vehicleSpecs.bodyType,
    record.vehicleSpecs.fuel,
    record.vehicleSpecs.transmission,
    record.vehicleSpecs.special,
    record.propertySpecs.area,
    record.propertySpecs.rooms,
    record.propertySpecs.bathrooms,
    record.propertySpecs.type,
    record.propertySpecs.address,
    record.propertySpecs.locationLatitude,
    record.propertySpecs.locationLongitude,
    record.propertySpecs.finishing,
    record.pharmacyCatalog.kind,
    record.pharmacyCatalog.categoryId,
    record.pharmacyCatalog.categoryNameAr,
    record.pharmacyCatalog.categoryNameEn,
    record.pharmacyCatalog.subcategoryId,
    record.pharmacyCatalog.subcategoryNameAr,
    record.pharmacyCatalog.subcategoryNameEn,
    record.pharmacyCatalog.fixedProductId,
    record.pharmacySpecs.pharmacyCategoryId,
    record.pharmacySpecs.pharmacyCategory,
    record.pharmacySpecs.pharmacySubcategoryId,
    record.pharmacySpecs.pharmacySubcategory,
    record.pharmacySpecs.activeIngredientId,
    record.pharmacySpecs.activeIngredient,
    record.pharmacySpecs.nameAr,
    record.pharmacySpecs.nameEn,
    record.pharmacySpecs.formId,
    record.pharmacySpecs.form,
    record.pharmacySpecs.concentrationId,
    record.pharmacySpecs.concentration,
    record.pharmacySpecs.prescriptionRequired ? 1 : 0,
    record.rating.rating,
    record.rating.comment,
    record.rating.enabled ? 1 : 0,
    record.rating.targetEnabled ? 1 : 0,
    record.rating.mode,
    JSON.stringify(record.images),
    record.status,
    record.createdAt,
    record.updatedAt,
  ];
}

function mergeRecord(
  existing: ProductRecord,
  details: ProductDetails,
  status: ProductStatus,
  updatedAt: string,
): ProductRecord {
  return {
    ...existing,
    ...createEmptyProductDetails(details),
    status,
    updatedAt,
  };
}

async function refreshProfileProductCounts(uid: string): Promise<void> {
  const rows = (await productDbClient.execute(
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
  await profileDbClient.execute(
    "DELETE FROM profile_category_product_counts WHERE uid = ?",
    [uid],
  );
  const timestamp = new Date().toISOString();
  for (const row of rows) {
    await profileDbClient.execute(
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

export class ProductRepository {
  async findById(id: string): Promise<ProductRecord | null> {
    const rows = (await productDbClient.execute(
      `SELECT ${PRODUCT_COLUMNS.join(", ")} FROM products WHERE id = ? LIMIT 1`,
      [id],
    )) as ProductRow[];
    return rows[0] ? mapProductRow(rows[0]) : null;
  }

  async findByOwnerAndCategory(
    uid: string,
    mainCategoryId: string,
    subcategoryId: string,
  ): Promise<ProductRecord[]> {
    const rows = (await productDbClient.execute(
      `SELECT ${PRODUCT_COLUMNS.join(", ")} FROM products WHERE uid = ? AND main_category_id = ? AND subcategory_id = ? AND status != 'archived' ORDER BY created_at DESC`,
      [uid, mainCategoryId, subcategoryId],
    )) as ProductRow[];
    return rows.map(mapProductRow);
  }

  async create(record: ProductRecord): Promise<ProductRecord> {
    await productDbClient.execute(
      `INSERT INTO products (${PRODUCT_COLUMNS.join(", ")}) VALUES (${PRODUCT_COLUMNS.map(() => "?").join(", ")})`,
      rowValues(record),
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
    const next = mergeRecord(existing, details, status, updatedAt);
    const assignments = MUTABLE_COLUMNS.map((column) => `${column} = ?`).join(
      ", ",
    );
    const values = rowValues(next).filter(
      (_value, index) =>
        ![
          "id",
          "uid",
          "main_category_id",
          "subcategory_id",
          "created_at",
        ].includes(PRODUCT_COLUMNS[index] ?? ""),
    );
    await productDbClient.execute(
      `UPDATE products SET ${assignments} WHERE id = ? AND uid = ?`,
      [...values, id, uid],
    );
    await refreshProfileProductCounts(uid);
    return this.findById(id);
  }

  async delete(id: string, uid: string): Promise<boolean> {
    await productDbClient.execute("DELETE FROM products WHERE id = ? AND uid = ?", [
      id,
      uid,
    ]);
    await refreshProfileProductCounts(uid);
    return (await this.findById(id)) === null;
  }
}

export const productRepository = new ProductRepository();
