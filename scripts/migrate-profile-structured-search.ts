import { existsSync } from "fs";
import dotenv from "dotenv";
import Database from "better-sqlite3";
import { createClient } from "@libsql/client";
import { PROFILE_SQLITE_DB_PATH, PRODUCT_SQLITE_DB_PATH } from "../src/core/database/environment";
import type { ProfileSpecialtiesSelection } from "../src/features/profile/entities/profile-specialties.entity";
import { categoryService, CATEGORY_CONSTANTS } from "../src/features/categories";

if (existsSync(".env.local")) dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

type Db = {
  all<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  run(sql: string, params?: unknown[]): Promise<void>;
};

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const specialtyItems = categoryService.getSpecialtyColumnItems();
const doctorAppointmentItems = categoryService.getDoctorAppointmentItems();
const SPECIALTY_COLUMN_NAMES = Array.from(
  new Set(specialtyItems.map((item) => `${slug(item.titleEn)}_${item.originalId}`)),
);
const columnBySelection = new Map(
  specialtyItems.map((item) => [
    `${item.categoryId}:${item.originalId}`,
    `${slug(item.titleEn)}_${item.originalId}`,
  ]),
);
const columnByDoctorAppointment = new Map(
  doctorAppointmentItems.map((item) => [
    item.originalId,
    `${slug(item.nameEn)}_${item.originalId}`,
  ]),
);

function selectedSpecialtyColumns(selection: ProfileSpecialtiesSelection): Set<string> {
  const selected = new Set<string>();
  for (const [categoryId, originalIds] of Object.entries(selection.sub ?? {})) {
    for (const originalId of originalIds) {
      const column = columnBySelection.get(`${categoryId}:${originalId}`);
      if (column) selected.add(column);
    }
  }
  for (const mainCategoryId of selection.main ?? []) {
    if (mainCategoryId === CATEGORY_CONSTANTS.DELIVERY_SERVICES_ID) {
      selected.add("delivery_services_46");
    } else {
      const column = columnBySelection.get(`${mainCategoryId}:${mainCategoryId}`);
      if (column) selected.add(column);
      const memberTree = categoryService.getCategoryTree(mainCategoryId);
      if (memberTree) {
        for (const subcategory of memberTree.subcategories) {
          const subColumn = columnBySelection.get(`${mainCategoryId}:${subcategory.originalId}`);
          if (subColumn) selected.add(subColumn);
        }
      }
    }
  }
  return selected;
}

function sqliteDb(path: string): Db & { close(): void } {
  const db = new Database(path);
  return {
    async all<T>(sql: string, params: unknown[] = []) {
      return db.prepare(sql).all(...params) as T[];
    },
    async run(sql: string, params: unknown[] = []) {
      db.prepare(sql).run(...params);
    },
    close() {
      db.close();
    },
  };
}

function tursoDb(kind: "profile" | "product" = "profile"): Db {
  const url =
    kind === "profile"
      ? process.env.TURSO_PROFILE_DATABASE_URL
      : process.env.TURSO_PRODUCT_DATABASE_URL || process.env.TURSO_DATABASE_URL;
  const authToken =
    kind === "profile"
      ? process.env.TURSO_PROFILE_AUTH_TOKEN
      : process.env.TURSO_PRODUCT_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) throw new Error(`Turso ${kind} credentials are missing`);
  const client = createClient({ url, authToken });
  return {
    async all<T>(sql: string, params: unknown[] = []) {
      const result = await client.execute({ sql, args: params as never[] });
      return result.rows as T[];
    },
    async run(sql: string, params: unknown[] = []) {
      await client.execute({ sql, args: params as never[] });
    },
  };
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value.trim()) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function digits(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

function searchText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ");
}

async function tableColumns(db: Db, table: string): Promise<Set<string>> {
  const rows = await db.all<{ name: string }>(`PRAGMA table_info(${table})`);
  return new Set(rows.map((row) => row.name));
}

async function tableExists(db: Db, table: string): Promise<boolean> {
  const rows = await db.all<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
    [table],
  );
  return rows.length > 0;
}

async function createStructuredTables(db: Db): Promise<void> {
  await db.run("PRAGMA foreign_keys=off");
  await db.run(`CREATE TABLE IF NOT EXISTS profile_contact_points (id text PRIMARY KEY NOT NULL, uid text NOT NULL, type text NOT NULL, platform text NOT NULL DEFAULT '', label text NOT NULL DEFAULT '', value text NOT NULL, normalized_value text NOT NULL DEFAULT '', handle text NOT NULL DEFAULT '', is_primary integer NOT NULL DEFAULT 0, is_public integer NOT NULL DEFAULT 1, sort_order integer NOT NULL DEFAULT 0, created_at text NOT NULL, updated_at text NOT NULL)`);
  await db.run(`CREATE INDEX IF NOT EXISTS profile_contact_points_uid_idx ON profile_contact_points (uid)`);
  await db.run(`CREATE INDEX IF NOT EXISTS profile_contact_points_lookup_idx ON profile_contact_points (type, normalized_value)`);
  await db.run(`CREATE TABLE IF NOT EXISTS profile_locations (id text PRIMARY KEY NOT NULL, uid text NOT NULL, label text NOT NULL DEFAULT '', address text NOT NULL DEFAULT '', governorate text NOT NULL DEFAULT '', city text NOT NULL DEFAULT '', area text NOT NULL DEFAULT '', latitude text NOT NULL DEFAULT '', longitude text NOT NULL DEFAULT '', is_primary integer NOT NULL DEFAULT 0, is_public integer NOT NULL DEFAULT 1, sort_order integer NOT NULL DEFAULT 0, created_at text NOT NULL, updated_at text NOT NULL)`);
  await db.run(`CREATE INDEX IF NOT EXISTS profile_locations_uid_idx ON profile_locations (uid)`);
  await db.run(`CREATE INDEX IF NOT EXISTS profile_locations_geo_idx ON profile_locations (latitude, longitude)`);
  await db.run(`CREATE TABLE IF NOT EXISTS profile_images (id text PRIMARY KEY NOT NULL, uid text NOT NULL, image_key text NOT NULL, image_type text NOT NULL, is_primary integer NOT NULL DEFAULT 0, sort_order integer NOT NULL DEFAULT 0, created_at text NOT NULL, updated_at text NOT NULL)`);
  await db.run(`CREATE INDEX IF NOT EXISTS profile_images_uid_type_idx ON profile_images (uid, image_type)`);
  await db.run(`CREATE UNIQUE INDEX IF NOT EXISTS profile_images_uid_key_unique ON profile_images (uid, image_key, image_type)`);
  await db.run(`CREATE TABLE IF NOT EXISTS profile_featured_products (uid text NOT NULL, product_id text NOT NULL, sort_order integer NOT NULL DEFAULT 0, created_at text NOT NULL, PRIMARY KEY(uid, product_id))`);
  await db.run(`CREATE TABLE IF NOT EXISTS profile_trending_items (id text PRIMARY KEY NOT NULL, uid text NOT NULL, label text NOT NULL, sort_order integer NOT NULL DEFAULT 0, created_at text NOT NULL, updated_at text NOT NULL)`);
  await db.run(`CREATE INDEX IF NOT EXISTS profile_trending_items_uid_idx ON profile_trending_items (uid)`);
  await db.run(`CREATE TABLE IF NOT EXISTS profile_working_hours (id text PRIMARY KEY NOT NULL, uid text NOT NULL, day_of_week integer NOT NULL, period_index integer NOT NULL DEFAULT 0, is_open integer NOT NULL DEFAULT 0, open_time text NOT NULL DEFAULT '', close_time text NOT NULL DEFAULT '', note text NOT NULL DEFAULT '', created_at text NOT NULL, updated_at text NOT NULL)`);
  await db.run(`CREATE INDEX IF NOT EXISTS profile_working_hours_uid_idx ON profile_working_hours (uid)`);
  await db.run(`CREATE UNIQUE INDEX IF NOT EXISTS profile_working_hours_period_unique ON profile_working_hours (uid, day_of_week, period_index)`);
  await db.run(`CREATE TABLE IF NOT EXISTS profile_delivery_carriers (seller_uid text NOT NULL, carrier_uid text NOT NULL, is_default integer NOT NULL DEFAULT 0, priority integer NOT NULL DEFAULT 0, created_at text NOT NULL, updated_at text NOT NULL, PRIMARY KEY(seller_uid, carrier_uid))`);
  await db.run(`CREATE INDEX IF NOT EXISTS profile_delivery_carriers_carrier_idx ON profile_delivery_carriers (carrier_uid)`);
  await db.run(`CREATE TABLE IF NOT EXISTS profile_search_categories (uid text NOT NULL, category_id integer NOT NULL, subcategory_id integer NOT NULL, specialty_column text NOT NULL, source text NOT NULL DEFAULT 'profile', is_enabled integer NOT NULL DEFAULT 1, updated_at text NOT NULL, PRIMARY KEY(uid, category_id, subcategory_id, source))`);
  await db.run(`CREATE INDEX IF NOT EXISTS profile_search_categories_lookup_idx ON profile_search_categories (category_id, subcategory_id, is_enabled)`);
  await db.run(`CREATE TABLE IF NOT EXISTS profile_category_product_counts (uid text NOT NULL, category_id text NOT NULL, subcategory_id text NOT NULL, active_product_count integer NOT NULL DEFAULT 0, draft_product_count integer NOT NULL DEFAULT 0, archived_product_count integer NOT NULL DEFAULT 0, updated_at text NOT NULL, PRIMARY KEY(uid, category_id, subcategory_id))`);
  await db.run(`CREATE INDEX IF NOT EXISTS profile_category_product_counts_lookup_idx ON profile_category_product_counts (category_id, subcategory_id)`);
}

async function rebuildUserProfiles(db: Db): Promise<Array<Record<string, unknown>>> {
  const columns = await tableColumns(db, "user_profiles");
  if (!columns.has("phones_json")) return [];
  const oldRows = await db.all<Record<string, unknown>>("SELECT * FROM user_profiles");
  await db.run(`CREATE TABLE user_profiles_next (uid text PRIMARY KEY NOT NULL, store_name text NOT NULL DEFAULT '', store_description text NOT NULL DEFAULT '', store_story text NOT NULL DEFAULT '', store_name_search text NOT NULL DEFAULT '', store_description_search text NOT NULL DEFAULT '', custom_request_enabled integer NOT NULL DEFAULT 1, trending_label text NOT NULL DEFAULT 'الأكثر رواجًا', primary_phone text NOT NULL DEFAULT '', primary_phone_normalized text NOT NULL DEFAULT '', primary_whatsapp text NOT NULL DEFAULT '', primary_whatsapp_normalized text NOT NULL DEFAULT '', primary_email text NOT NULL DEFAULT '', primary_address text NOT NULL DEFAULT '', primary_governorate text NOT NULL DEFAULT '', primary_city text NOT NULL DEFAULT '', primary_area text NOT NULL DEFAULT '', primary_latitude text NOT NULL DEFAULT '', primary_longitude text NOT NULL DEFAULT '', rating_enabled integer NOT NULL DEFAULT 1, rating_mode text NOT NULL DEFAULT 'stars-comments', rating_average integer NOT NULL DEFAULT 0, rating_count integer NOT NULL DEFAULT 0, shipping_pricing_mode text NOT NULL DEFAULT 'free', shipping_flat_rate integer NOT NULL DEFAULT 0, shipping_location_base_rate integer NOT NULL DEFAULT 0, shipping_special_vehicle_fee integer NOT NULL DEFAULT 0, shipping_free_shipping_threshold integer NOT NULL DEFAULT 0, shipping_notes text NOT NULL DEFAULT '', returns_enabled integer NOT NULL DEFAULT 0, return_window_days integer NOT NULL DEFAULT 14, return_shipping_payer text NOT NULL DEFAULT 'case_by_case', return_policy_text text NOT NULL DEFAULT '')`);
  for (const row of oldRows) {
    const details = parseJson<Record<string, any>>(row.store_details_json, {});
    const rating = parseJson<Record<string, any>>(row.rating_settings_json, {});
    const fulfillment = parseJson<Record<string, any>>(row.fulfillment_settings_json, {});
    const phones = parseJson<Array<Record<string, any>>>(row.phones_json, []);
    const emails = parseJson<Array<Record<string, any>>>(row.emails_json, []);
    const locations = parseJson<Array<Record<string, any>>>(row.location_json, []);
    const primaryPhone = String(phones[0]?.number ?? "");
    const primaryWhatsapp = String(phones.find((phone) => phone.type === "whatsapp")?.number ?? primaryPhone);
    const primaryEmail = String(emails.find((email) => email.isPrimary)?.email ?? emails[0]?.email ?? "");
    const primaryLocation = locations[0] ?? {};
    await db.run(
      `INSERT INTO user_profiles_next VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.uid,
        details.storeName ?? "",
        details.storeDescription ?? "",
        details.storeStory ?? "",
        searchText(details.storeName),
        searchText(details.storeDescription),
        details.profileShowcase?.customRequestEnabled === false ? 0 : 1,
        details.profileShowcase?.trending?.label ?? "الأكثر رواجًا",
        primaryPhone,
        digits(primaryPhone),
        primaryWhatsapp,
        digits(primaryWhatsapp),
        primaryEmail,
        primaryLocation.address ?? "",
        "",
        "",
        "",
        primaryLocation.latitude ?? "",
        primaryLocation.longitude ?? "",
        rating.enabled === false ? 0 : 1,
        rating.mode ?? "stars-comments",
        0,
        0,
        fulfillment.shippingPricing?.mode ?? "free",
        fulfillment.shippingPricing?.flatRate ?? 0,
        fulfillment.shippingPricing?.locationBaseRate ?? 0,
        fulfillment.shippingPricing?.specialVehicleFee ?? 0,
        fulfillment.shippingPricing?.freeShippingThreshold ?? 0,
        fulfillment.shippingPricing?.notes ?? "",
        fulfillment.returns?.enabled === true ? 1 : 0,
        fulfillment.returns?.returnWindowDays ?? 14,
        fulfillment.returns?.returnShippingPayer ?? "case_by_case",
        fulfillment.returns?.policyText ?? "",
      ],
    );
  }
  await db.run("DROP TABLE user_profiles");
  await db.run("ALTER TABLE user_profiles_next RENAME TO user_profiles");
  await db.run(`CREATE INDEX IF NOT EXISTS user_profiles_store_name_search_idx ON user_profiles (store_name_search)`);
  await db.run(`CREATE INDEX IF NOT EXISTS user_profiles_primary_phone_idx ON user_profiles (primary_phone_normalized)`);
  await db.run(`CREATE INDEX IF NOT EXISTS user_profiles_primary_location_idx ON user_profiles (primary_latitude, primary_longitude)`);
  return oldRows;
}

async function populateStructuredData(db: Db, oldRows: Array<Record<string, unknown>>): Promise<void> {
  if (oldRows.length === 0) return;
  const timestamp = new Date().toISOString();
  for (const row of oldRows) {
    const uid = String(row.uid);
    const phones = parseJson<Array<Record<string, any>>>(row.phones_json, []);
    const emails = parseJson<Array<Record<string, any>>>(row.emails_json, []);
    const websites = parseJson<Array<Record<string, any>>>(row.websites_json, []);
    const socialLinks = parseJson<Array<Record<string, any>>>(row.social_links_json, []);
    const locations = parseJson<Array<Record<string, any>>>(row.location_json, []);
    const coverKeys = parseJson<string[]>(row.cover_image_keys_json, []);
    const details = parseJson<Record<string, any>>(row.store_details_json, {});
    const fulfillment = parseJson<Record<string, any>>(row.fulfillment_settings_json, {});
    const specialties = parseJson<ProfileSpecialtiesSelection>(row.specialties_json, { main: [], sub: {} });

    for (const [index, phone] of phones.entries()) {
      if (!phone.number) continue;
      await db.run(`INSERT OR REPLACE INTO profile_contact_points VALUES (?, ?, 'phone', ?, ?, ?, ?, '', ?, 1, ?, ?, ?)`, [
        phone.id || id("contact"),
        uid,
        phone.type || "phone",
        phone.type || "phone",
        phone.number,
        digits(phone.number),
        phone.id === "primary-whatsapp" || index === 0 ? 1 : 0,
        index,
        timestamp,
        timestamp,
      ]);
    }
    for (const [index, email] of emails.entries()) {
      if (!email.email) continue;
      await db.run(`INSERT OR REPLACE INTO profile_contact_points VALUES (?, ?, 'email', '', 'email', ?, ?, '', ?, 1, ?, ?, ?)`, [
        email.id || id("contact"),
        uid,
        email.email,
        String(email.email).toLowerCase(),
        email.isPrimary || index === 0 ? 1 : 0,
        100 + index,
        timestamp,
        timestamp,
      ]);
    }
    for (const [index, site] of websites.entries()) {
      if (!site.url) continue;
      await db.run(`INSERT OR REPLACE INTO profile_contact_points VALUES (?, ?, 'website', '', 'website', ?, ?, '', ?, 1, ?, ?, ?)`, [
        site.id || id("contact"),
        uid,
        site.url,
        String(site.url).toLowerCase(),
        index === 0 ? 1 : 0,
        200 + index,
        timestamp,
        timestamp,
      ]);
    }
    for (const [index, link] of socialLinks.entries()) {
      if (!link.url) continue;
      await db.run(`INSERT OR REPLACE INTO profile_contact_points VALUES (?, ?, 'social', ?, ?, ?, ?, ?, 0, 1, ?, ?, ?)`, [
        link.id || id("contact"),
        uid,
        link.platform || "",
        link.platform || "",
        link.url,
        String(link.url).toLowerCase(),
        link.handle || "",
        300 + index,
        timestamp,
        timestamp,
      ]);
    }
    for (const [index, location] of locations.entries()) {
      if (!location.address) continue;
      await db.run(`INSERT OR REPLACE INTO profile_locations VALUES (?, ?, ?, ?, '', '', '', ?, ?, ?, 1, ?, ?, ?)`, [
        location.id || id("location"),
        uid,
        index === 0 ? "primary" : "",
        location.address,
        location.latitude ?? "",
        location.longitude ?? "",
        index === 0 ? 1 : 0,
        index,
        timestamp,
        timestamp,
      ]);
    }
    if (row.avatar_image_key) {
      await db.run(`INSERT OR REPLACE INTO profile_images VALUES (?, ?, ?, 'avatar', 1, 0, ?, ?)`, [
        id("image"),
        uid,
        row.avatar_image_key,
        timestamp,
        timestamp,
      ]);
    }
    for (const [index, key] of coverKeys.entries()) {
      await db.run(`INSERT OR REPLACE INTO profile_images VALUES (?, ?, ?, 'cover', ?, ?, ?, ?)`, [
        id("image"),
        uid,
        key,
        index === 0 ? 1 : 0,
        index,
        timestamp,
        timestamp,
      ]);
    }
    for (const [index, productId] of (details.profileShowcase?.featuredProductIds ?? []).entries()) {
      await db.run(`INSERT OR REPLACE INTO profile_featured_products VALUES (?, ?, ?, ?)`, [uid, productId, index, timestamp]);
    }
    for (const [index, item] of (details.profileShowcase?.trending?.items ?? []).entries()) {
      if (!item.label) continue;
      await db.run(`INSERT OR REPLACE INTO profile_trending_items VALUES (?, ?, ?, ?, ?, ?)`, [
        item.id || id("trending"),
        uid,
        item.label,
        index,
        timestamp,
        timestamp,
      ]);
    }
    for (const [index, carrierUid] of (fulfillment.carrierUids ?? []).entries()) {
      await db.run(`INSERT OR REPLACE INTO profile_delivery_carriers VALUES (?, ?, ?, ?, ?, ?)`, [
        uid,
        carrierUid,
        index === 0 ? 1 : 0,
        index,
        timestamp,
        timestamp,
      ]);
    }
    await rebuildSearchCategories(db, uid, specialties);
  }
}

async function rebuildSearchCategories(db: Db, uid: string, selection: ProfileSpecialtiesSelection): Promise<void> {
  const timestamp = new Date().toISOString();
  await db.run("DELETE FROM profile_search_categories WHERE uid = ?", [uid]);
  const rows = [
    ...(selection.main ?? []).map((categoryId) => ({
      categoryId,
      subcategoryId: categoryId,
      column: categoryId === 46 ? "delivery_services_46" : columnBySelection.get(`${categoryId}:${categoryId}`) ?? "",
      source: "main",
    })),
    ...Object.entries(selection.sub ?? {}).flatMap(([categoryId, ids]) =>
      ids.map((subcategoryId) => ({
        categoryId: Number(categoryId),
        subcategoryId,
        column:
          columnBySelection.get(`${categoryId}:${subcategoryId}`) ??
          columnByDoctorAppointment.get(subcategoryId) ??
          "",
        source: "profile",
      })),
    ),
  ].filter((row) => row.column);
  for (const row of rows) {
    await db.run(`INSERT OR REPLACE INTO profile_search_categories VALUES (?, ?, ?, ?, ?, 1, ?)`, [
      uid,
      row.categoryId,
      row.subcategoryId,
      row.column,
      row.source,
      timestamp,
    ]);
  }
  const enabled = selectedSpecialtyColumns(selection);
  if (await tableExists(db, "user_specialties")) {
    const values = SPECIALTY_COLUMN_NAMES.map((column) => (enabled.has(column) ? 1 : 0));
    const cols = SPECIALTY_COLUMN_NAMES.map((column) => `\`${column}\``).join(", ");
    const placeholders = SPECIALTY_COLUMN_NAMES.map(() => "?").join(", ");
    const updates = SPECIALTY_COLUMN_NAMES.map((column) => `\`${column}\` = excluded.\`${column}\``).join(", ");
    await db.run(`INSERT INTO user_specialties (uid, ${cols}) VALUES (?, ${placeholders}) ON CONFLICT(uid) DO UPDATE SET ${updates}`, [uid, ...values]);
  }
}

async function refreshProductCounts(profileDb: Db, productDb: Db): Promise<void> {
  if (!(await tableExists(productDb, "products"))) return;
  await profileDb.run("DELETE FROM profile_category_product_counts");
  const rows = await productDb.all<{
    uid: string;
    category_id: string;
    subcategory_id: string;
    active_count: number;
    draft_count: number;
    archived_count: number;
  }>(`SELECT uid, main_category_id category_id, subcategory_id, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) active_count, SUM(CASE WHEN status='draft' THEN 1 ELSE 0 END) draft_count, SUM(CASE WHEN status='archived' THEN 1 ELSE 0 END) archived_count FROM products WHERE COALESCE(pharmacy_catalog_kind, '') != 'fixed' GROUP BY uid, main_category_id, subcategory_id`);
  const timestamp = new Date().toISOString();
  for (const row of rows) {
    await profileDb.run(`INSERT OR REPLACE INTO profile_category_product_counts VALUES (?, ?, ?, ?, ?, ?, ?)`, [
      row.uid,
      row.category_id,
      row.subcategory_id,
      Number(row.active_count ?? 0),
      Number(row.draft_count ?? 0),
      Number(row.archived_count ?? 0),
      timestamp,
    ]);
  }
}

async function migrate(db: Db, productDb?: Db) {
  await createStructuredTables(db);
  const oldRows = await rebuildUserProfiles(db);
  await populateStructuredData(db, oldRows);
  if (productDb) await refreshProductCounts(db, productDb);
  await db.run("PRAGMA foreign_keys=on");
}

async function main() {
  const cloud = process.argv.includes("--cloud");
  if (cloud) {
    const db = tursoDb();
    const productDb = tursoDb("product");
    await migrate(db, productDb);
    console.log("Profile Turso structured migration completed");
    return;
  }
  const db = sqliteDb(PROFILE_SQLITE_DB_PATH);
  const productDb = sqliteDb(PRODUCT_SQLITE_DB_PATH);
  try {
    await migrate(db, productDb);
  } finally {
    db.close();
    productDb.close();
  }
  console.log("Local profile structured migration completed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
