import "server-only";

import storageProfiles from "@/config/storage-profiles.json";
import { getR2S3Credentials } from "@/core/config/server-env.values";
import {
  deleteR2Object,
  downloadR2Object,
  listR2Objects,
  uploadR2Object,
} from "@/core/provisioning/r2-s3-client";

import type {
  DevCloudBackupR2ObjectManifest,
  DevCloudBackupScope,
} from "../domain/types";

interface StorageProfileConfig {
  profiles?: Array<{
    enabled?: boolean;
    provider?: string;
    folder?: string;
    cloudFolder?: string;
  }>;
}

export interface R2BackupExport {
  bucketName?: string;
  prefixes: string[];
  objects: DevCloudBackupR2ObjectManifest[];
  files: Record<string, Uint8Array>;
  totalBytes: number;
}

function r2FileForKey(key: string): string {
  return `r2/objects/${encodeURIComponent(key)}`;
}

function keyFromR2File(file: string): string {
  const encoded = file.replace(/^r2\/objects\//, "");
  return decodeURIComponent(encoded);
}

function knownPrefixes(): string[] {
  const config = storageProfiles as StorageProfileConfig;
  const prefixes = new Set<string>();
  for (const profile of config.profiles ?? []) {
    if (profile.enabled === false) continue;
    if (profile.provider !== "CloudflareR2") continue;
    const folder = (profile.cloudFolder ?? profile.folder)?.replace(/^\/+|\/+$/g, "");
    if (folder) prefixes.add(`${folder}/`);
  }
  return [...prefixes].sort();
}

async function listAll(prefix: string): Promise<Array<{ path: string; updatedAt?: string }>> {
  const objects: Array<{ path: string; updatedAt?: string }> = [];
  let token: string | undefined;
  do {
    const page = await listR2Objects(prefix, 1000, token);
    objects.push(...page.objects);
    token = page.continuationToken;
  } while (token);
  return objects;
}

export class R2BackupRepository {
  prefixesForScope(scope: DevCloudBackupScope): string[] {
    return scope === "all-r2" ? [""] : knownPrefixes();
  }

  async exportObjects(scope: DevCloudBackupScope): Promise<R2BackupExport> {
    const prefixes = this.prefixesForScope(scope);
    const seen = new Set<string>();
    const files: Record<string, Uint8Array> = {};
    const objects: DevCloudBackupR2ObjectManifest[] = [];
    let totalBytes = 0;
    let bucketName: string | undefined;
    try {
      bucketName = getR2S3Credentials().bucketName;
    } catch {
      bucketName = undefined;
    }

    for (const prefix of prefixes) {
      for (const item of await listAll(prefix)) {
        if (seen.has(item.path)) continue;
        seen.add(item.path);
        const downloaded = await downloadR2Object(item.path);
        const file = r2FileForKey(item.path);
        files[file] = downloaded.body;
        const size = downloaded.size ?? downloaded.body.byteLength;
        totalBytes += size;
        objects.push({
          key: item.path,
          file,
          size,
          contentType: downloaded.contentType,
          lastModified: downloaded.lastModified ?? item.updatedAt,
          etag: downloaded.etag,
        });
      }
    }

    return {
      bucketName,
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
    prefixes: string[],
  ): Promise<{ uploaded: number; deleted: number }> {
    let uploaded = 0;
    let deleted = 0;
    const backupKeys = new Set(objects.map((object) => object.key));

    for (const object of objects) {
      const body = files[object.file] ?? files[r2FileForKey(object.key)];
      if (!body) throw new Error(`Missing R2 object in backup: ${object.key}`);
      await uploadR2Object(object.key, body, object.contentType);
      uploaded += 1;
    }

    if (mode === "replace") {
      const targetPrefixes = prefixes.length ? prefixes : [""];
      const current = new Set<string>();
      for (const prefix of targetPrefixes) {
        for (const object of await listAll(prefix)) current.add(object.path);
      }
      for (const key of current) {
        if (!backupKeys.has(key)) {
          await deleteR2Object(key);
          deleted += 1;
        }
      }
    }

    return { uploaded, deleted };
  }

  manifestKeyFromFile(file: string): string {
    return keyFromR2File(file);
  }
}

export const r2BackupRepository = new R2BackupRepository();
