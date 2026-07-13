import "server-only";

import { randomUUID } from "node:crypto";

import { productDbClient } from "@/core/database/product-db-client";
import type {
  PharmacyOverrideStatus,
  PharmacyProfileCategoryOverride,
  PharmacyProfileProductOverride,
  PharmacyProfileSubcategoryOverride,
} from "../entities/pharmacy-profile-catalog.types";

interface CategoryOverrideRow {
  id: string;
  uid: string;
  fixed_category_id: number | null;
  name_ar: string | null;
  name_en: string | null;
  icon: string | null;
  status: PharmacyOverrideStatus;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

interface SubcategoryOverrideRow {
  id: string;
  uid: string;
  fixed_subcategory_id: number | null;
  parent_category_id: string;
  name_ar: string | null;
  name_en: string | null;
  status: PharmacyOverrideStatus;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

interface ProductOverrideRow {
  id: string;
  uid: string;
  fixed_product_id: number | null;
  parent_subcategory_id: string;
  name_ar: string | null;
  name_en: string | null;
  description: string | null;
  image_url: string | null;
  image_key: string | null;
  form_id: string | null;
  form_name_ar: string | null;
  strength_id: string | null;
  strength_value: string | null;
  prescription_required: number | null;
  price_text: string | null;
  price_minor: number | null;
  status: PharmacyOverrideStatus;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

function mapCategory(row: CategoryOverrideRow): PharmacyProfileCategoryOverride {
  return {
    id: row.id,
    uid: row.uid,
    fixedCategoryId: row.fixed_category_id,
    nameAr: row.name_ar,
    nameEn: row.name_en,
    icon: row.icon,
    status: row.status,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSubcategory(
  row: SubcategoryOverrideRow,
): PharmacyProfileSubcategoryOverride {
  return {
    id: row.id,
    uid: row.uid,
    fixedSubcategoryId: row.fixed_subcategory_id,
    parentCategoryId: row.parent_category_id,
    nameAr: row.name_ar,
    nameEn: row.name_en,
    status: row.status,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProduct(row: ProductOverrideRow): PharmacyProfileProductOverride {
  return {
    id: row.id,
    uid: row.uid,
    fixedProductId: row.fixed_product_id,
    parentSubcategoryId: row.parent_subcategory_id,
    nameAr: row.name_ar,
    nameEn: row.name_en,
    description: row.description,
    imageUrl: row.image_url,
    imageKey: row.image_key,
    formId: row.form_id,
    formNameAr: row.form_name_ar,
    strengthId: row.strength_id,
    strengthValue: row.strength_value,
    prescriptionRequired:
      row.prescription_required === null
        ? null
        : row.prescription_required === 1,
    priceText: row.price_text,
    priceMinor: row.price_minor,
    status: row.status,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PharmacyProfileCatalogRepository {
  async listCategoryOverrides(
    uid: string,
  ): Promise<PharmacyProfileCategoryOverride[]> {
    const rows = (await productDbClient.execute(
      "SELECT * FROM pharmacy_profile_category_overrides WHERE uid = ?",
      [uid],
    )) as CategoryOverrideRow[];
    return rows.map(mapCategory);
  }

  async listSubcategoryOverrides(
    uid: string,
  ): Promise<PharmacyProfileSubcategoryOverride[]> {
    const rows = (await productDbClient.execute(
      "SELECT * FROM pharmacy_profile_subcategory_overrides WHERE uid = ?",
      [uid],
    )) as SubcategoryOverrideRow[];
    return rows.map(mapSubcategory);
  }

  async listProductOverrides(
    uid: string,
  ): Promise<PharmacyProfileProductOverride[]> {
    const rows = (await productDbClient.execute(
      "SELECT * FROM pharmacy_profile_product_overrides WHERE uid = ?",
      [uid],
    )) as ProductOverrideRow[];
    return rows.map(mapProduct);
  }

  async findProductOverrideByFixedId(
    uid: string,
    fixedProductId: number,
  ): Promise<PharmacyProfileProductOverride | null> {
    const rows = (await productDbClient.execute(
      "SELECT * FROM pharmacy_profile_product_overrides WHERE uid = ? AND fixed_product_id = ? LIMIT 1",
      [uid, fixedProductId],
    )) as ProductOverrideRow[];
    return rows[0] ? mapProduct(rows[0]) : null;
  }

  async upsertFixedProductOverride(input: {
    uid: string;
    fixedProductId: number;
    parentSubcategoryId: string;
    nameAr?: string | null;
    nameEn?: string | null;
    description?: string | null;
    imageUrl?: string | null;
    imageKey?: string | null;
    formId?: string | null;
    formNameAr?: string | null;
    strengthId?: string | null;
    strengthValue?: string | null;
    prescriptionRequired?: boolean | null;
    priceText?: string | null;
    priceMinor?: number | null;
    status?: PharmacyOverrideStatus;
  }): Promise<PharmacyProfileProductOverride> {
    const now = new Date().toISOString();
    const existing = await this.findProductOverrideByFixedId(
      input.uid,
      input.fixedProductId,
    );
    const values = [
      input.parentSubcategoryId,
      input.nameAr ?? null,
      input.nameEn ?? null,
      input.description ?? null,
      input.imageUrl ?? null,
      input.imageKey ?? null,
      input.formId ?? null,
      input.formNameAr ?? null,
      input.strengthId ?? null,
      input.strengthValue ?? null,
      input.prescriptionRequired === null ||
      input.prescriptionRequired === undefined
        ? null
        : input.prescriptionRequired
          ? 1
          : 0,
      input.priceText ?? null,
      input.priceMinor ?? null,
      input.status ?? "visible",
      now,
    ];
    if (existing) {
      await productDbClient.execute(
        "UPDATE pharmacy_profile_product_overrides SET parent_subcategory_id=?, name_ar=?, name_en=?, description=?, image_url=?, image_key=?, form_id=?, form_name_ar=?, strength_id=?, strength_value=?, prescription_required=?, price_text=?, price_minor=?, status=?, updated_at=? WHERE id=?",
        [...values, existing.id],
      );
      return (await this.findProductOverrideByFixedId(
        input.uid,
        input.fixedProductId,
      ))!;
    }
    const id = randomUUID();
    await productDbClient.execute(
      "INSERT INTO pharmacy_profile_product_overrides (id,uid,fixed_product_id,parent_subcategory_id,name_ar,name_en,description,image_url,image_key,form_id,form_name_ar,strength_id,strength_value,prescription_required,price_text,price_minor,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [id, input.uid, input.fixedProductId, ...values, now],
    );
    return (await this.findProductOverrideByFixedId(
      input.uid,
      input.fixedProductId,
    ))!;
  }
}

export const pharmacyProfileCatalogRepository =
  new PharmacyProfileCatalogRepository();
