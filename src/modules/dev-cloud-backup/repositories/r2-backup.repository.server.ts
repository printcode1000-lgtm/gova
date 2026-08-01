import "server-only";

import {
  getProductR2S3Credentials,
  getR2S3Credentials,
} from "@/core/config/server-env.values";
import {
  deleteProductR2Object,
  deleteR2Object,
  downloadProductR2Object,
  downloadR2Object,
  listProductR2Objects,
  listR2Objects,
  uploadProductR2Object,
  uploadR2Object,
} from "@/core/provisioning/r2-s3-client";

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
  bucketName: () => string;
  list: typeof listR2Objects;
  download: typeof downloadR2Object;
  upload: typeof uploadR2Object;
  remove: typeof deleteR2Object;
}

const R2_STORAGES: R2StorageOperations[] = [
  {
    storage: "primary",
    bucketName: () => getR2S3Credentials().bucketName,
    list: listR2Objects,
    download: downloadR2Object,
    upload: uploadR2Object,
    remove: deleteR2Object,
  },
  {
    storage: "products",
    bucketName: () => getProductR2S3Credentials().bucketName,
    list: listProductR2Objects,
    download: downloadProductR2Object,
    upload: uploadProductR2Object,
    remove: deleteProductR2Object,
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
  const objects: Array<{ path: string; updatedAt?: string }> = [];
  let token: string | undefined;
  do {
    const page = await operations.list(prefix, 1000, token);
    objects.push(...page.objects);
    token = page.continuationToken;
  } while (token);
  return objects;
}

/** Every object in every bucket. The backup admits no prefix exclusions. */
const FULL_BUCKET_PREFIXES = [""] as const;

export class R2BackupRepository {
  prefixes(): string[] {
    return [...FULL_BUCKET_PREFIXES];
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
          const downloaded = await operations.download(item.path);
          const file = r2FileForKey(operations.storage, item.path);
          files[file] = downloaded.body;
          const size = downloaded.size ?? downloaded.body.byteLength;
          totalBytes += size;
          objects.push({
            storage: operations.storage,
            key: item.path,
            file,
            size,
            contentType: downloaded.contentType,
            lastModified: downloaded.lastModified ?? item.updatedAt,
            etag: downloaded.etag,
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
      await operations.upload(object.key, body, object.contentType);
      uploaded += 1;
    }

    if (mode === "replace") {
      for (const operations of R2_STORAGES) {
        for (const prefix of FULL_BUCKET_PREFIXES) {
          for (const object of await listAll(operations, prefix)) {
            if (!backupKeys.has(`${operations.storage}:${object.path}`)) {
              await operations.remove(object.path);
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
