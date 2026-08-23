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
import { StorageInventoryPart1 } from "./storage-inventory.repository.part-01";
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

export class StorageInventoryPart2 extends StorageInventoryPart1 {
  protected async collectDynamicReferences(
    objectPaths: string[],
    warnings: string[],
  ): Promise<StorageReference[]> {
    if (objectPaths.length === 0) return [];
    const databases: Array<{
      name: string;
      client: GenericDatabaseClient;
    }> = [
      { name: "users", client: usersDataSource },
      { name: "product", client: productsDataSource },
      { name: "advertisements", client: advertisementsDataSource },
      ...DATABASE_SHARD_NAMES.map((databaseName) => ({
        name: databaseName,
        client: new ShardedRawDatabaseClient(
          Object.fromEntries(DATABASE_SHARDS[databaseName].map((table) => [table, databaseName])),
          databaseName as DatabaseShardName,
        ) as GenericDatabaseClient,
      })),
    ];
    const references: StorageReference[] = [];
    for (const database of databases) {
      try {
        const tables = await database.client.execute(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        );
        for (const tableRow of tables) {
          const table = text(tableRow.name);
          if (!table || NON_REFERENCE_TABLES.has(table)) continue;
          const columns = await database.client.execute(
            `PRAGMA table_info(${quoteIdentifier(table)})`,
          );
          const idColumn = columns.some((column) => text(column.name) === "id")
            ? "id"
            : "";
          const textColumns = columns
            .filter((column) => isTextColumnType(column.type))
            .map((column) => text(column.name))
            .filter(Boolean);
          if (textColumns.length === 0) continue;
          const where = textColumns
            .map((column) => `${quoteIdentifier(column)} LIKE '%images/%'`)
            .join(" OR ");
          const selectedColumns = [
            idColumn
              ? `${quoteIdentifier(idColumn)} AS __record_id`
              : "rowid AS __record_id",
            ...textColumns.map((column) => quoteIdentifier(column)),
          ].join(", ");
          const rows = await database.client.execute(
            `SELECT ${selectedColumns} FROM ${quoteIdentifier(table)} WHERE ${where} LIMIT 5000`,
          );
          for (const row of rows) {
            for (const column of textColumns) {
              const value = row[column];
              for (const objectPath of objectPaths) {
                if (!textContainsObjectPath(value, objectPath)) continue;
                const dynamicReference = referenceFromObjectPath({
                  objectPath,
                  database: database.name,
                  table,
                  recordId: text(row.__record_id),
                  ownerUid: "",
                });
                if (dynamicReference) references.push(dynamicReference);
              }
            }
          }
        }
      } catch (error) {
        warnings.push(
          `${database.name}: dynamic reference scan failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
    return references;
  }
}
