import "server-only";

import { randomUUID } from "node:crypto";

import { productDbClient } from "@/core/database/product-db-client";
import type {
  PharmacyOverrideStatus,
  PharmacyProfileCategoryOverride,
  PharmacyProfileProductOverride,
  PharmacyProfileSubcategoryOverride,
} from "../entities/pharmacy-profile-catalog.types";

function isMissingPharmacyTable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("pharmacy_profile_") &&
    (message.toLowerCase().includes("no such table") ||
      message.toLowerCase().includes("not found"))
  );
}

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
    try {
      const rows = (await productDbClient.execute(
        "SELECT * FROM pharmacy_profile_category_overrides WHERE uid = ?",
        [uid],
      )) as CategoryOverrideRow[];
      return rows.map(mapCategory);
    } catch (error) {
      if (isMissingPharmacyTable(error)) return [];
      throw error;
    }
  }

  async listSubcategoryOverrides(
    uid: string,
  ): Promise<PharmacyProfileSubcategoryOverride[]> {
    try {
      const rows = (await productDbClient.execute(
        "SELECT * FROM pharmacy_profile_subcategory_overrides WHERE uid = ?",
        [uid],
      )) as SubcategoryOverrideRow[];
      return rows.map(mapSubcategory);
    } catch (error) {
      if (isMissingPharmacyTable(error)) return [];
      throw error;
    }
  }

  async listProductOverrides(
    uid: string,
  ): Promise<PharmacyProfileProductOverride[]> {
    try {
      const rows = (await productDbClient.execute(
        "SELECT * FROM pharmacy_profile_product_overrides WHERE uid = ?",
        [uid],
      )) as ProductOverrideRow[];
      return rows.map(mapProduct);
    } catch (error) {
      if (isMissingPharmacyTable(error)) return [];
      throw error;
    }
  }

  async findProductOverrideByFixedId(
    uid: string,
    fixedProductId: number,
  ): Promise<PharmacyProfileProductOverride | null> {
    try {
      const rows = (await productDbClient.execute(
        "SELECT * FROM pharmacy_profile_product_overrides WHERE uid = ? AND fixed_product_id = ? LIMIT 1",
        [uid, fixedProductId],
      )) as ProductOverrideRow[];
      return rows[0] ? mapProduct(rows[0]) : null;
    } catch (error) {
      if (isMissingPharmacyTable(error)) return null;
      throw error;
    }
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

  async createCustomCategory(input: {
    uid: string;
    nameAr: string;
    nameEn?: string;
    icon?: string;
  }): Promise<PharmacyProfileCategoryOverride> {
    const now = new Date().toISOString();
    const id = randomUUID();
    await productDbClient.execute(
      "INSERT INTO pharmacy_profile_category_overrides (id,uid,fixed_category_id,name_ar,name_en,icon,status,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
      [
        id,
        input.uid,
        null,
        input.nameAr,
        input.nameEn ?? input.nameAr,
        input.icon ?? "fas fa-pills",
        "custom",
        null,
        now,
        now,
      ],
    );
    const rows = (await productDbClient.execute(
      "SELECT * FROM pharmacy_profile_category_overrides WHERE id = ? LIMIT 1",
      [id],
    )) as CategoryOverrideRow[];
    return mapCategory(rows[0]!);
  }

  async createCustomSubcategory(input: {
    uid: string;
    parentCategoryId: string;
    nameAr: string;
    nameEn?: string;
  }): Promise<PharmacyProfileSubcategoryOverride> {
    const now = new Date().toISOString();
    const id = randomUUID();
    await productDbClient.execute(
      "INSERT INTO pharmacy_profile_subcategory_overrides (id,uid,fixed_subcategory_id,parent_category_id,name_ar,name_en,status,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
      [
        id,
        input.uid,
        null,
        input.parentCategoryId,
        input.nameAr,
        input.nameEn ?? input.nameAr,
        "custom",
        null,
        now,
        now,
      ],
    );
    const rows = (await productDbClient.execute(
      "SELECT * FROM pharmacy_profile_subcategory_overrides WHERE id = ? LIMIT 1",
      [id],
    )) as SubcategoryOverrideRow[];
    return mapSubcategory(rows[0]!);
  }

  async updateCategoryName(input: {
    uid: string;
    categoryId: string;
    nameAr: string;
    nameEn?: string;
  }): Promise<void> {
    const now = new Date().toISOString();
    const fixedCategoryId = Number(input.categoryId);
    if (Number.isInteger(fixedCategoryId)) {
      const existing = (await productDbClient.execute(
        "SELECT id FROM pharmacy_profile_category_overrides WHERE uid=? AND fixed_category_id=? LIMIT 1",
        [input.uid, fixedCategoryId],
      )) as Array<{ id: string }>;
      if (existing[0]) {
        await productDbClient.execute(
          "UPDATE pharmacy_profile_category_overrides SET name_ar=?, name_en=?, updated_at=? WHERE id=?",
          [input.nameAr, input.nameEn ?? input.nameAr, now, existing[0].id],
        );
        return;
      }
      await productDbClient.execute(
        "INSERT INTO pharmacy_profile_category_overrides (id,uid,fixed_category_id,name_ar,name_en,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)",
        [
          randomUUID(),
          input.uid,
          fixedCategoryId,
          input.nameAr,
          input.nameEn ?? input.nameAr,
          "visible",
          now,
          now,
        ],
      );
      return;
    }
    await productDbClient.execute(
      "UPDATE pharmacy_profile_category_overrides SET name_ar=?, name_en=?, updated_at=? WHERE id=? AND uid=? AND fixed_category_id IS NULL",
      [input.nameAr, input.nameEn ?? input.nameAr, now, input.categoryId, input.uid],
    );
  }

  async updateSubcategoryName(input: {
    uid: string;
    subcategoryId: string;
    parentCategoryId: string;
    nameAr: string;
    nameEn?: string;
  }): Promise<void> {
    const now = new Date().toISOString();
    const fixedSubcategoryId = Number(input.subcategoryId);
    if (Number.isInteger(fixedSubcategoryId)) {
      const existing = (await productDbClient.execute(
        "SELECT id FROM pharmacy_profile_subcategory_overrides WHERE uid=? AND fixed_subcategory_id=? LIMIT 1",
        [input.uid, fixedSubcategoryId],
      )) as Array<{ id: string }>;
      if (existing[0]) {
        await productDbClient.execute(
          "UPDATE pharmacy_profile_subcategory_overrides SET parent_category_id=?, name_ar=?, name_en=?, updated_at=? WHERE id=?",
          [
            input.parentCategoryId,
            input.nameAr,
            input.nameEn ?? input.nameAr,
            now,
            existing[0].id,
          ],
        );
        return;
      }
      await productDbClient.execute(
        "INSERT INTO pharmacy_profile_subcategory_overrides (id,uid,fixed_subcategory_id,parent_category_id,name_ar,name_en,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
        [
          randomUUID(),
          input.uid,
          fixedSubcategoryId,
          input.parentCategoryId,
          input.nameAr,
          input.nameEn ?? input.nameAr,
          "visible",
          now,
          now,
        ],
      );
      return;
    }
    await productDbClient.execute(
      "UPDATE pharmacy_profile_subcategory_overrides SET name_ar=?, name_en=?, updated_at=? WHERE id=? AND uid=? AND fixed_subcategory_id IS NULL",
      [input.nameAr, input.nameEn ?? input.nameAr, now, input.subcategoryId, input.uid],
    );
  }

  async setFixedCategoryStatus(
    uid: string,
    fixedCategoryId: number,
    status: PharmacyOverrideStatus,
  ): Promise<void> {
    const now = new Date().toISOString();
    const existing = (await productDbClient.execute(
      "SELECT id FROM pharmacy_profile_category_overrides WHERE uid=? AND fixed_category_id=? LIMIT 1",
      [uid, fixedCategoryId],
    )) as Array<{ id: string }>;
    if (existing[0]) {
      await productDbClient.execute(
        "UPDATE pharmacy_profile_category_overrides SET status=?, updated_at=? WHERE id=?",
        [status, now, existing[0].id],
      );
      return;
    }
    await productDbClient.execute(
      "INSERT INTO pharmacy_profile_category_overrides (id,uid,fixed_category_id,status,created_at,updated_at) VALUES (?,?,?,?,?,?)",
      [randomUUID(), uid, fixedCategoryId, status, now, now],
    );
  }

  async setFixedSubcategoryStatus(
    uid: string,
    fixedSubcategoryId: number,
    parentCategoryId: string,
    status: PharmacyOverrideStatus,
  ): Promise<void> {
    const now = new Date().toISOString();
    const existing = (await productDbClient.execute(
      "SELECT id FROM pharmacy_profile_subcategory_overrides WHERE uid=? AND fixed_subcategory_id=? LIMIT 1",
      [uid, fixedSubcategoryId],
    )) as Array<{ id: string }>;
    if (existing[0]) {
      await productDbClient.execute(
        "UPDATE pharmacy_profile_subcategory_overrides SET parent_category_id=?, status=?, updated_at=? WHERE id=?",
        [parentCategoryId, status, now, existing[0].id],
      );
      return;
    }
    await productDbClient.execute(
      "INSERT INTO pharmacy_profile_subcategory_overrides (id,uid,fixed_subcategory_id,parent_category_id,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",
      [randomUUID(), uid, fixedSubcategoryId, parentCategoryId, status, now, now],
    );
  }

  async setCustomCategoryStatus(
    uid: string,
    id: string,
    status: PharmacyOverrideStatus,
  ): Promise<void> {
    await productDbClient.execute(
      "UPDATE pharmacy_profile_category_overrides SET status=?, updated_at=? WHERE id=? AND uid=? AND fixed_category_id IS NULL",
      [status, new Date().toISOString(), id, uid],
    );
  }

  async setCustomSubcategoryStatus(
    uid: string,
    id: string,
    status: PharmacyOverrideStatus,
  ): Promise<void> {
    await productDbClient.execute(
      "UPDATE pharmacy_profile_subcategory_overrides SET status=?, updated_at=? WHERE id=? AND uid=? AND fixed_subcategory_id IS NULL",
      [status, new Date().toISOString(), id, uid],
    );
  }
}

export const pharmacyProfileCatalogRepository =
  new PharmacyProfileCatalogRepository();
