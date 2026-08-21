import "server-only";

import {
  getAccountS3Credentials,
  uploadR2Object,
  deleteR2Object,
  downloadR2Object,
  listR2Objects,
} from "@asol/storage-core/server";

import type { DevCloudBackupR2ObjectManifest } from "../domain/types";

export interface R2BackupExport {
  bucketNames: Partial<Record<R2Storage, string>>;
  prefixes: string[];
  objects: DevCloudBackupR2ObjectManifest[];
  files: Record<string, Uint8Array>;
  totalBytes: number;
}

type R2Storage = "primary" | "products";

interface R2StorageOperations {
  storage: R2Storage;
  accountId: string;
  bucketName: () => string;
}

const R2_STORAGES: R2StorageOperations[] = [
  {
    storage: "primary",
    accountId: "general",
    bucketName: () => getAccountS3Credentials("general").bucketName,
  },
  {
    storage: "products",
    accountId: "products",
    bucketName: () => getAccountS3Credentials("products").bucketName,
  },
];

function r2FileForKey(storage: R2Storage, key: string): string {
  return `r2/${storage}/objects/${encodeURIComponent(key)}`;
}

function keyFromR2File(file: string): string {
  const encoded = file.replace(/^r2\/objects\//, "");
  return decodeURIComponent(encoded);
}

async function listAll(
  operations: R2StorageOperations,
  prefix: string,
): Promise<Array<{ path: string; updatedAt?: string }>> {
  const items = await listR2Objects(prefix, operations.accountId);
  return items.map((item) => ({
    path: item.key,
    updatedAt: item.lastModified?.toISOString(),
  }));
}

/** Every object in every bucket. The backup admits no prefix exclusions. */
const FULL_BUCKET_PREFIXES = [""] as const;

export function backupStoragePrefixes(): string[] {
  return [...FULL_BUCKET_PREFIXES];
}

export class R2BackupRepository {
  prefixes(): string[] {
    return backupStoragePrefixes();
  }

  async exportObjects(): Promise<R2BackupExport> {
    const prefixes = this.prefixes();
    const seen = new Set<string>();
    const files: Record<string, Uint8Array> = {};
    const objects: DevCloudBackupR2ObjectManifest[] = [];
    let totalBytes = 0;
    const bucketNames: R2BackupExport["bucketNames"] = {};

    for (const operations of R2_STORAGES) {
      bucketNames[operations.storage] = operations.bucketName();
      for (const prefix of FULL_BUCKET_PREFIXES) {
        for (const item of await listAll(operations, prefix)) {
          const identity = `${operations.storage}:${item.path}`;
          if (seen.has(identity)) continue;
          seen.add(identity);
          const downloaded = await downloadR2Object(item.path, operations.accountId);
          const file = r2FileForKey(operations.storage, item.path);
          files[file] = downloaded;
          const size = downloaded.byteLength;
          totalBytes += size;
          objects.push({
            storage: operations.storage,
            key: item.path,
            file,
            size,
            contentType: "application/octet-stream",
            lastModified: item.updatedAt,
          });
        }
      }
    }

    return {
      bucketNames,
      prefixes,
      files,
      objects: objects.sort((left, right) => left.key.localeCompare(right.key)),
      totalBytes,
    };
  }

  async restoreObjects(
    objects: DevCloudBackupR2ObjectManifest[],
    files: Record<string, Uint8Array>,
    mode: "merge" | "replace",
  ): Promise<{ uploaded: number; deleted: number }> {
    let uploaded = 0;
    let deleted = 0;
    const backupKeys = new Set(objects.map((object) => `${object.storage}:${object.key}`));

    for (const object of objects) {
      const operations = R2_STORAGES.find((entry) => entry.storage === object.storage);
      if (!operations) throw new Error(`Unknown R2 storage in backup: ${object.storage}`);
      const body = files[object.file] ?? files[r2FileForKey(object.storage, object.key)];
      if (!body) throw new Error(`Missing R2 object in backup: ${object.key}`);
      await uploadR2Object(object.key, Buffer.from(body), object.contentType ?? "application/octet-stream", operations.accountId);
      uploaded += 1;
    }

    if (mode === "replace") {
      for (const operations of R2_STORAGES) {
        for (const prefix of FULL_BUCKET_PREFIXES) {
          for (const object of await listAll(operations, prefix)) {
            if (!backupKeys.has(`${operations.storage}:${object.path}`)) {
              await deleteR2Object(object.path, operations.accountId);
              deleted += 1;
            }
          }
        }
      }
    }

    return { uploaded, deleted };
  }

  manifestKeyFromFile(file: string): string {
    return keyFromR2File(file.replace(/^r2\/(?:primary|products)\//, "r2/"));
  }
}

export const r2BackupRepository = new R2BackupRepository();
