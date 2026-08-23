import { advertisementsDataSource, productsDataSource, profilesDataSource, usersDataSource } from "../../../../core/data-source-registry";
import "server-only";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  DATABASE_SHARDS,
  DATABASE_SHARD_NAMES,
  type DatabaseShardName,
} from "../../../../core/database/database-shards";
import type { IDatabaseClient } from "../../../../core/database/database-client.interface";
import { ShardedRawDatabaseClient } from "../../../../core/database/sharded-raw-database-client";
import { getAllStorageProfiles, imageStorageOrchestrator } from "@asol/storage-core/server";
import { storageFolderCandidates } from "@asol/storage-core";
import { createMarketplaceOrdersDb } from "../../../marketplace-orders/db/client";
export interface StorageReference {
  storageProfileId: string;
  imageKey: string;
  objectPath: string;
  database: string;
  table: string;
  recordId: string;
  ownerUid: string;
}
export interface StorageInventory {
  references: StorageReference[];
  objectPaths: Set<string>;
  objects: Map<string, StorageObjectEntry>;
  missingStaticAssets: Array<{ id: string; path: string }>;
  scannedRecords: number;
  warnings: string[];
}
type Row = Record<string, unknown>;
type StorageObjectEntry = { path: string; updatedAt?: string };
type GenericDatabaseClient = Pick<IDatabaseClient, "execute">;
const IMAGE_EXTENSION_PATTERN = /\.(?:avif|gif|jpe?g|png|webp)$/i;
const IGNORED_STORAGE_FILE_NAMES = new Set([
  ".gitkeep",
  ".gitignore",
  ".ds_store",
  "thumbs.db",
]);
const NON_REFERENCE_TABLES = new Set([
  "data_health_runs",
  "data_health_findings",
  "data_health_cleanup_plans",
  "data_health_cleanup_audit",
  "data_health_quarantine",
  "data_health_locks",
  "data_health_order_purge_plans",
  "system_logs",
]);
function text(value: unknown): string {
  return String(value ?? "").trim();
}
function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}
function parseJson(value: unknown): unknown {
  try {
    return JSON.parse(text(value) || "null") as unknown;
  } catch {
    return null;
  }
}
function collectStoredImages(
  value: unknown,
  defaultStorageProfileId: string,
  result = new Map<string, { storageProfileId: string; imageKey: string }>(),
) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectStoredImages(item, defaultStorageProfileId, result);
    }
    return result;
  }
  if (!value || typeof value !== "object") return result;
  const record = value as Record<string, unknown>;
  const imageKey = text(record.imageKey ?? record.image_key);
  const storageProfileId =
    text(record.storageProfileId ?? record.storage_profile_id) ||
    defaultStorageProfileId;
  if (imageKey) {
    result.set(`${storageProfileId}:${imageKey}`, {
      storageProfileId,
      imageKey,
    });
  }
  for (const item of Object.values(record)) {
    collectStoredImages(item, defaultStorageProfileId, result);
  }
  return result;
}
function normalizeObjectPath(value: string): string {
  return value.trim().replace(/\\/g, "/").replace(/^\/+/, "");
}
function isImageObjectPath(objectPath: string): boolean {
  const normalized = normalizeObjectPath(objectPath);
  const fileName = normalized.split("/").pop()?.toLowerCase() ?? "";
  return (
    Boolean(fileName) &&
    !IGNORED_STORAGE_FILE_NAMES.has(fileName) &&
    IMAGE_EXTENSION_PATTERN.test(fileName)
  );
}
function objectPathFromUrlOrPath(value: unknown): string {
  const raw = text(value);
  if (!raw) return "";
  try {
    const parsed = new URL(raw, "https://asol.local");
    return normalizeObjectPath(parsed.pathname);
  } catch {
    return normalizeObjectPath(raw);
  }
}
function reference(
  input: Omit<StorageReference, "objectPath">,
): StorageReference {
  const profile = imageStorageOrchestrator.getProfile(input.storageProfileId);
  return {
    ...input,
    objectPath: imageStorageOrchestrator.resolveObjectPath(
      profile.id,
      input.imageKey,
    ),
  };
}
function referenceFromObjectPath(
  input: Omit<StorageReference, "objectPath" | "imageKey" | "storageProfileId"> & {
    objectPath: string;
  },
): StorageReference | null {
  const objectPath = normalizeObjectPath(input.objectPath);
  const profile = getAllStorageProfiles()
    .filter((candidate) => candidate.enabled)
    .sort(
      (left, right) =>
        Math.max(...storageFolderCandidates(right).map((item) => item.length)) -
        Math.max(...storageFolderCandidates(left).map((item) => item.length)),
    )
    .find(
      (candidate) =>
        storageFolderCandidates(candidate).some(
          (folder) =>
            objectPath === folder ||
            objectPath.startsWith(`${folder}/`) ||
            objectPath.startsWith(`sync_data/sync_file/${folder}/`),
        ),
    );
  if (!profile) return null;
  const canonicalObjectPath = objectPath.startsWith("sync_data/sync_file/")
    ? objectPath.slice("sync_data/sync_file/".length)
    : objectPath;
  if (!isImageObjectPath(canonicalObjectPath)) return null;
  const matchedFolder = storageFolderCandidates(profile)
    .sort((left, right) => right.length - left.length)
    .find(
      (folder) =>
        canonicalObjectPath === folder ||
        canonicalObjectPath.startsWith(`${folder}/`),
    );
  if (!matchedFolder) return null;
  return {
    ...input,
    storageProfileId: profile.id,
    imageKey: canonicalObjectPath.slice(matchedFolder.length + 1),
    objectPath: canonicalObjectPath,
  };
}
function isTextColumnType(value: unknown): boolean {
  const type = text(value).toUpperCase();
  return (
    !type ||
    type.includes("TEXT") ||
    type.includes("CHAR") ||
    type.includes("CLOB") ||
    type.includes("JSON") ||
    type.includes("VARCHAR")
  );
}
function addReferenceIfMissing(
  references: StorageReference[],
  seenReferences: Set<string>,
  referenceItem: StorageReference | null,
) {
  if (!referenceItem) return;
  const key = `${referenceItem.objectPath}:${referenceItem.database}:${referenceItem.table}:${referenceItem.recordId}`;
  if (seenReferences.has(key)) return;
  seenReferences.add(key);
  references.push(referenceItem);
}
function textContainsObjectPath(value: unknown, objectPath: string): boolean {
  const normalized = normalizeObjectPath(text(value));
  if (!normalized) return false;
  return (
    normalized.includes(objectPath) ||
    normalized.includes(encodeURI(objectPath)) ||
    normalized.includes(objectPath.replace(/^images\//, "sync_data/sync_file/images/"))
  );
}

export abstract class StorageInventoryPart1 {
  async collect(): Promise<StorageInventory> {
    const ordersDb = createMarketplaceOrdersDb();
    const [profileImages, products, pharmacyOverrides, customImages, heroRows] =
      await Promise.all([
        profilesDataSource.execute(
          "SELECT id, uid, image_key, image_type FROM profile_images",
        ) as Promise<Row[]>,
        productsDataSource.execute(
          "SELECT id, uid, images_json FROM products",
        ) as Promise<Row[]>,
        productsDataSource.execute(
          "SELECT id, uid, image_url, image_key FROM pharmacy_profile_product_overrides WHERE (image_key IS NOT NULL AND image_key <> '') OR (image_url IS NOT NULL AND image_url <> '')",
        ) as Promise<Row[]>,
        ordersDb.execute(
          "SELECT id, uploaded_by, storage_profile_id, image_url, image_key FROM custom_request_images",
        ),
        advertisementsDataSource.execute(
          "SELECT id, config_json FROM hero_slider",
        ) as Promise<Row[]>,
      ]);

    const references: StorageReference[] = [];
    const seenReferences = new Set<string>();
    for (const row of profileImages) {
      const imageKey = text(row.image_key);
      if (!imageKey) continue;
      addReferenceIfMissing(
        references,
        seenReferences,
        reference({
          storageProfileId:
            text(row.image_type) === "avatar" ? "avatar" : "cover",
          imageKey,
          database: "profile",
          table: "profile_images",
          recordId: text(row.id),
          ownerUid: text(row.uid),
        }),
      );
    }

    for (const row of products) {
      const parsed = parseJson(row.images_json);
      for (const { storageProfileId, imageKey } of collectStoredImages(
        parsed,
        "product-default",
      ).values()) {
        if (imageKey.startsWith("pharmacy-fixed/")) continue;
        addReferenceIfMissing(
          references,
          seenReferences,
          reference({
            storageProfileId,
            imageKey,
            database: "product",
            table: "products",
            recordId: text(row.id),
            ownerUid: text(row.uid),
          }),
        );
      }
    }

    for (const row of pharmacyOverrides) {
      const imageKey = text(row.image_key);
      if (imageKey && !imageKey.startsWith("pharmacy-fixed/")) {
        addReferenceIfMissing(
          references,
          seenReferences,
          reference({
            storageProfileId: "product-default",
            imageKey,
            database: "product",
            table: "pharmacy_profile_product_overrides",
            recordId: text(row.id),
            ownerUid: text(row.uid),
          }),
        );
        continue;
      }
      const urlReference = referenceFromObjectPath({
        objectPath: objectPathFromUrlOrPath(row.image_url),
        database: "product",
        table: "pharmacy_profile_product_overrides",
        recordId: text(row.id),
        ownerUid: text(row.uid),
      });
      addReferenceIfMissing(references, seenReferences, urlReference);
    }

    for (const row of customImages) {
      const imageKey = text(row.image_key);
      if (imageKey) {
        addReferenceIfMissing(
          references,
          seenReferences,
          reference({
            storageProfileId: text(row.storage_profile_id) || "spicialOrder",
            imageKey,
            database: "orders-items",
            table: "custom_request_images",
            recordId: text(row.id),
            ownerUid: text(row.uploaded_by),
          }),
        );
        continue;
      }
      const urlReference = referenceFromObjectPath({
        objectPath: objectPathFromUrlOrPath(row.image_url),
        database: "orders-items",
        table: "custom_request_images",
        recordId: text(row.id),
        ownerUid: text(row.uploaded_by),
      });
      addReferenceIfMissing(references, seenReferences, urlReference);
    }

    for (const row of heroRows) {
      for (const { storageProfileId, imageKey } of collectStoredImages(
        parseJson(row.config_json),
        "home-hero-slider",
      ).values()) {
        addReferenceIfMissing(
          references,
          seenReferences,
          reference({
            storageProfileId,
            imageKey,
            database: "advertisements",
            table: "hero_slider",
            recordId: text(row.id),
            ownerUid: "",
          }),
        );
      }
    }
    const objects = new Map<string, StorageObjectEntry>();
    const warnings: string[] = [];
    for (const profile of getAllStorageProfiles().filter(
      (candidate) => candidate.enabled,
    )) {
      try {
        for (const object of await imageStorageOrchestrator.listByProfile(
          profile.id,
        )) {
          const objectPath = normalizeObjectPath(object.path);
          if (!isImageObjectPath(objectPath)) continue;
          objects.set(objectPath, { ...object, path: objectPath });
        }
      } catch (error) {
        warnings.push(
          `${profile.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    const pharmacyCatalog = JSON.parse(
      readFileSync(
        path.join(
          process.cwd(),
          "public/catagory/pharmacy/ingredients.json",
        ),
        "utf8",
      ),
    ) as { schemaVersion: 3; items: Array<{ id: number; imagePath?: string }> };
    const pharmacyAssets = pharmacyCatalog.items
      .filter((item) => item.imagePath)
      .map((item) => ({
        id: String(item.id),
        path: String(item.imagePath).replace(/^\/+/, ""),
      }));
    const missingStaticAssets = pharmacyAssets.filter(
      (asset) => !existsSync(path.join(process.cwd(), "public", asset.path)),
    );
    const objectPaths = new Set(objects.keys());
    const dynamicReferences = await this.collectDynamicReferences(
      [...objectPaths],
      warnings,
    );
    for (const item of dynamicReferences) {
      addReferenceIfMissing(references, seenReferences, item);
    }
    return {
      references,
      objectPaths,
      objects,
      missingStaticAssets,
      scannedRecords:
        profileImages.length +
        products.length +
        pharmacyOverrides.length +
        customImages.length +
        heroRows.length +
        objectPaths.size +
        pharmacyAssets.length,
      warnings,
    };
  }

  protected abstract collectDynamicReferences(objectPaths: string[], warnings: string[]): Promise<StorageReference[]>;
}
