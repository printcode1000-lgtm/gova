import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

import {
  assertDevCloudBackupAllowed,
  devCloudBackupEnvironment,
} from "../domain/development-guard.server";
import {
  DEV_CLOUD_BACKUP_MANIFEST_VERSION,
  DEV_CLOUD_BACKUP_MODULE_VERSION,
  devCloudBackupRestoreConfirmation,
  type DevCloudBackupInspectResult,
  type DevCloudBackupListItem,
  type DevCloudBackupDiffReport,
  type DevCloudBackupManifest,
  type DevCloudBackupRestoreMode,
  type DevCloudBackupRestorePreview,
  type DevCloudBackupRestoreResult,
  type DevCloudBackupSummary,
  type DevCloudBackupUpdateResult,
} from "../domain/types";
import { r2BackupRepository } from "../repositories/r2-backup.repository.server";
import { tursoBackupRepository } from "@asol/data-core/dev-cloud-backup";

const BACKUP_DIR = path.join(process.cwd(), ".backups", "dev-cloud");
const MANIFEST_FILE = "manifest.json";

function textFile(value: unknown): Uint8Array {
  return strToU8(JSON.stringify(value, null, 2));
}

function hashBytes(value?: Uint8Array): string {
  return createHash("sha256").update(value ?? new Uint8Array()).digest("hex");
}

function safeZipName(fileName: string): string {
  const base = path.basename(fileName);
  if (!/^gova-dev-cloud-backup-[A-Za-z0-9._-]+\.zip$/.test(base)) {
    throw new Error("devCloudBackupFileInvalid");
  }
  return base;
}

function parseManifest(files: Record<string, Uint8Array>): DevCloudBackupManifest {
  const raw = files[MANIFEST_FILE];
  if (!raw) throw new Error("devCloudBackupManifestMissing");
  const manifest = JSON.parse(strFromU8(raw)) as DevCloudBackupManifest & {
    r2?: DevCloudBackupManifest["r2"] & {
      bucketName?: string;
      bucketNames?: DevCloudBackupManifest["r2"]["bucketNames"];
      objects?: Array<DevCloudBackupManifest["r2"]["objects"][number] & { storage?: "primary" | "products" }>;
    };
  };
  if (!manifest || manifest.manifestVersion !== DEV_CLOUD_BACKUP_MANIFEST_VERSION) {
    throw new Error("devCloudBackupManifestUnsupported");
  }
  if (manifest.environment !== "development") {
    throw new Error("devCloudBackupManifestInvalidEnvironment");
  }
  const r2 = manifest.r2;
  if (!r2) throw new Error("devCloudBackupManifestInvalidR2");

  // Archives created before R2 was split had one unnamed bucket; it is the primary bucket.
  return {
    ...manifest,
    r2: {
      ...r2,
      bucketNames: r2.bucketNames ?? (r2.bucketName ? { primary: r2.bucketName } : {}),
      objects: (r2.objects ?? []).map((object) => ({
        ...object,
        storage: object.storage ?? "primary",
      })),
    },
  };
}

function summarize(
  fileName: string,
  zip: Uint8Array,
  manifest: DevCloudBackupManifest,
): DevCloudBackupSummary {
  const tableCount = manifest.databases.reduce(
    (sum, database) => sum + database.tables.length,
    0,
  );
  const rowCount = manifest.databases.reduce(
    (sum, database) =>
      sum + database.tables.reduce((tableSum, table) => tableSum + table.rowCount, 0),
    0,
  );
  return {
    backupId: manifest.backupId,
    fileName,
    sizeBytes: zip.byteLength,
    createdAt: manifest.createdAt,
    databaseCount: manifest.databases.length,
    tableCount,
    rowCount,
    r2ObjectCount: manifest.r2.objectCount,
    r2TotalBytes: manifest.r2.totalBytes,
    downloadUrl: `/api/super-admin/dev-cloud-backup/backups/download?file=${encodeURIComponent(fileName)}`,
    manifest,
  };
}

function tableRows(manifest: DevCloudBackupManifest) {
  return manifest.databases.reduce(
    (sum, database) =>
      sum + database.tables.reduce((tableSum, table) => tableSum + table.rowCount, 0),
    0,
  );
}

export class DevCloudBackupService {
  environment() {
    return devCloudBackupEnvironment();
  }

  async list(): Promise<{ environment: ReturnType<typeof devCloudBackupEnvironment>; backups: DevCloudBackupListItem[] }> {
    assertDevCloudBackupAllowed();
    const environment = devCloudBackupEnvironment();
    await mkdir(BACKUP_DIR, { recursive: true });
    const entries = await readdir(BACKUP_DIR);
    const backups: DevCloudBackupListItem[] = [];
    for (const entry of entries.filter((item) => item.endsWith(".zip"))) {
      const fullPath = path.join(BACKUP_DIR, entry);
      const info = await stat(fullPath);
      backups.push({
        fileName: entry,
        sizeBytes: info.size,
        modifiedAt: info.mtime.toISOString(),
      });
    }
    backups.sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt));
    return { environment, backups };
  }

  private async buildArchive(
    extraFiles: Record<string, Uint8Array> = {},
  ): Promise<{
    backupId: string;
    createdAt: string;
    files: Record<string, Uint8Array>;
    manifest: DevCloudBackupManifest;
    zip: Uint8Array;
  }> {
    assertDevCloudBackupAllowed();
    const backupId = randomUUID();
    const createdAt = new Date().toISOString();
    const files: Record<string, Uint8Array> = {};
    const databases = [];

    for (const source of tursoBackupRepository.sources()) {
      const backup = await tursoBackupRepository.exportDatabase(source);
      Object.assign(files, backup.files);
      databases.push(backup.manifest);
    }

    const r2 = await r2BackupRepository.exportObjects();
    Object.assign(files, r2.files);

    const manifest: DevCloudBackupManifest = {
      manifestVersion: DEV_CLOUD_BACKUP_MANIFEST_VERSION,
      createdByModuleVersion: DEV_CLOUD_BACKUP_MODULE_VERSION,
      backupId,
      createdAt,
      environment: "development",
      databases,
      r2: {
        bucketNames: r2.bucketNames,
        objectCount: r2.objects.length,
        totalBytes: r2.totalBytes,
        objects: r2.objects,
        prefixes: r2.prefixes,
      },
    };

    Object.assign(files, extraFiles);
    files[MANIFEST_FILE] = textFile(manifest);
    const zip = zipSync(files, { level: 6 });
    return { backupId, createdAt, files, manifest, zip };
  }

  private async saveArchive(
    archive: {
      backupId: string;
      createdAt: string;
      manifest: DevCloudBackupManifest;
      zip: Uint8Array;
    },
    suffix = "",
  ): Promise<DevCloudBackupSummary> {
    await mkdir(BACKUP_DIR, { recursive: true });
    const stamp = archive.createdAt.replace(/[:.]/g, "-");
    const fileName = `gova-dev-cloud-backup-${stamp}-${archive.backupId.slice(0, 8)}${suffix}.zip`;
    await writeFile(path.join(BACKUP_DIR, fileName), archive.zip);
    return summarize(fileName, archive.zip, archive.manifest);
  }

  async create(): Promise<DevCloudBackupSummary> {
    const archive = await this.buildArchive();
    return this.saveArchive(archive);
  }

  async readBackup(fileName: string): Promise<{ fileName: string; body: Buffer }> {
    assertDevCloudBackupAllowed();
    const safeName = safeZipName(fileName);
    const fullPath = path.join(BACKUP_DIR, safeName);
    if (!existsSync(fullPath)) throw new Error("devCloudBackupNotFound");
    return { fileName: safeName, body: await readFile(fullPath) };
  }

  inspectZip(buffer: Uint8Array): DevCloudBackupInspectResult {
    assertDevCloudBackupAllowed();
    const files = unzipSync(buffer);
    const manifest = parseManifest(files);
    const warnings: string[] = [];
    for (const database of manifest.databases) {
      for (const table of database.tables) {
        if (!files[table.file]) warnings.push(`Missing table file: ${table.file}`);
      }
    }
    for (const object of manifest.r2.objects) {
      if (!files[object.file]) warnings.push(`Missing R2 object file: ${object.file}`);
    }
    return { valid: true, manifest, warnings };
  }

  previewRestore(
    buffer: Uint8Array,
    mode: DevCloudBackupRestoreMode,
  ): DevCloudBackupRestorePreview {
    const inspected = this.inspectZip(buffer);
    return {
      mode,
      confirmationText: devCloudBackupRestoreConfirmation(mode),
      databases: inspected.manifest.databases.map((database) => ({
        id: database.id,
        tableCount: database.tables.length,
        rowCount: database.tables.reduce((sum, table) => sum + table.rowCount, 0),
      })),
      r2ObjectCount: inspected.manifest.r2.objectCount,
      warnings: inspected.warnings,
    };
  }

  async compareWithCloud(buffer: Uint8Array): Promise<DevCloudBackupDiffReport> {
    assertDevCloudBackupAllowed();
    const zipFiles = unzipSync(buffer);
    const zipManifest = parseManifest(zipFiles);
    const cloud = await this.buildArchive();
    const comparedAt = new Date().toISOString();
    const databaseDifferences: DevCloudBackupDiffReport["databaseDifferences"] = [];
    const r2Differences: DevCloudBackupDiffReport["r2Differences"] = [];

    const zipDatabases = new Map(zipManifest.databases.map((database) => [database.id, database]));
    const cloudDatabases = new Map(cloud.manifest.databases.map((database) => [database.id, database]));
    const databaseIds = new Set([...zipDatabases.keys(), ...cloudDatabases.keys()]);
    for (const databaseId of databaseIds) {
      const zipDatabase = zipDatabases.get(databaseId);
      const cloudDatabase = cloudDatabases.get(databaseId);
      const zipTables = new Map(zipDatabase?.tables.map((table) => [table.name, table]) ?? []);
      const cloudTables = new Map(cloudDatabase?.tables.map((table) => [table.name, table]) ?? []);
      const tableNames = new Set([...zipTables.keys(), ...cloudTables.keys()]);
      for (const tableName of tableNames) {
        const zipTable = zipTables.get(tableName);
        const cloudTable = cloudTables.get(tableName);
        const zipHash = zipTable ? hashBytes(zipFiles[zipTable.file]) : "";
        const cloudHash = cloudTable ? hashBytes(cloud.files[cloudTable.file]) : "";
        if (!zipTable && cloudTable) {
          databaseDifferences.push({
            databaseId,
            table: tableName,
            status: "missing-in-zip",
            zipRows: 0,
            cloudRows: cloudTable.rowCount,
          });
        } else if (zipTable && !cloudTable) {
          databaseDifferences.push({
            databaseId,
            table: tableName,
            status: "missing-in-cloud",
            zipRows: zipTable.rowCount,
            cloudRows: 0,
          });
        } else if (zipTable && cloudTable && zipHash !== cloudHash) {
          databaseDifferences.push({
            databaseId,
            table: tableName,
            status: "changed",
            zipRows: zipTable.rowCount,
            cloudRows: cloudTable.rowCount,
          });
        }
      }
    }

    const objectIdentity = (object: (typeof zipManifest.r2.objects)[number]) => `${object.storage}:${object.key}`;
    const zipObjects = new Map(zipManifest.r2.objects.map((object) => [objectIdentity(object), object]));
    const cloudObjects = new Map(cloud.manifest.r2.objects.map((object) => [objectIdentity(object), object]));
    const objectKeys = new Set([...zipObjects.keys(), ...cloudObjects.keys()]);
    for (const key of objectKeys) {
      const zipObject = zipObjects.get(key);
      const cloudObject = cloudObjects.get(key);
      const zipHash = zipObject ? hashBytes(zipFiles[zipObject.file]) : "";
      const cloudHash = cloudObject ? hashBytes(cloud.files[cloudObject.file]) : "";
      if (!zipObject && cloudObject) {
        r2Differences.push({
          storage: cloudObject.storage,
          key: cloudObject.key,
          status: "missing-in-zip",
          cloudSize: cloudObject.size,
        });
      } else if (zipObject && !cloudObject) {
        r2Differences.push({
          storage: zipObject.storage,
          key: zipObject.key,
          status: "missing-in-cloud",
          zipSize: zipObject.size,
        });
      } else if (zipObject && cloudObject && zipHash !== cloudHash) {
        r2Differences.push({
          storage: cloudObject.storage,
          key: cloudObject.key,
          status: "changed",
          zipSize: zipObject.size,
          cloudSize: cloudObject.size,
        });
      }
    }

    return {
      comparedAt,
      zipBackupId: zipManifest.backupId,
      cloudBackupId: cloud.manifest.backupId,
      status:
        databaseDifferences.length === 0 && r2Differences.length === 0
          ? "matched"
          : "different",
      databaseDifferences,
      r2Differences,
      summary: {
        changedTables: databaseDifferences.length,
        changedR2Objects: r2Differences.length,
        zipRows: tableRows(zipManifest),
        cloudRows: tableRows(cloud.manifest),
        zipR2Objects: zipManifest.r2.objectCount,
        cloudR2Objects: cloud.manifest.r2.objectCount,
      },
    };
  }

  async updateZipFromCloud(buffer: Uint8Array): Promise<DevCloudBackupUpdateResult> {
    assertDevCloudBackupAllowed();
    const zipFiles = unzipSync(buffer);
    const originalManifest = parseManifest(zipFiles);
    const diff = await this.compareWithCloud(buffer);
    const archive = await this.buildArchive({
      "reports/cloud-diff.json": textFile(diff),
      "reports/original-manifest.json": textFile(originalManifest),
    });
    const summary = await this.saveArchive(archive, "-cloud-updated");
    return { ...summary, diff };
  }

  async updateSavedBackupFromCloud(fileName: string): Promise<DevCloudBackupUpdateResult> {
    const backup = await this.readBackup(fileName);
    return this.updateZipFromCloud(new Uint8Array(backup.body));
  }

  async compareSavedBackupWithCloud(fileName: string): Promise<DevCloudBackupDiffReport> {
    const backup = await this.readBackup(fileName);
    return this.compareWithCloud(new Uint8Array(backup.body));
  }

  async inspectSavedBackup(fileName: string): Promise<{
    inspect: DevCloudBackupInspectResult;
    preview: DevCloudBackupRestorePreview;
  }> {
    const backup = await this.readBackup(fileName);
    const buffer = new Uint8Array(backup.body);
    return {
      inspect: this.inspectZip(buffer),
      preview: this.previewRestore(buffer, "merge"),
    };
  }

  async deleteSavedBackup(fileName: string): Promise<{ deleted: true; fileName: string }> {
    assertDevCloudBackupAllowed();
    const safeName = safeZipName(fileName);
    const fullPath = path.join(BACKUP_DIR, safeName);
    if (!existsSync(fullPath)) throw new Error("devCloudBackupNotFound");
    await unlink(fullPath);
    return { deleted: true, fileName: safeName };
  }

  async restore(
    buffer: Uint8Array,
    mode: DevCloudBackupRestoreMode,
    confirmationText: string,
  ): Promise<DevCloudBackupRestoreResult> {
    assertDevCloudBackupAllowed();
    if (confirmationText !== devCloudBackupRestoreConfirmation(mode)) {
      throw new Error("devCloudBackupRestoreConfirmationRequired");
    }
    const files = unzipSync(buffer);
    const manifest = parseManifest(files);
    const inspected = this.inspectZip(buffer);
    if (inspected.warnings.length > 0) throw new Error("devCloudBackupArchiveIncomplete");

    let restoredDatabases = 0;
    let restoredTables = 0;
    let restoredRows = 0;
    for (const database of manifest.databases) {
      if (database.error) {
        throw new Error(`devCloudBackupArchiveIncomplete:${database.id}`);
      }
      const result = await tursoBackupRepository.restoreDatabase(database, files, mode);
      restoredDatabases += 1;
      restoredTables += result.tableCount;
      restoredRows += result.rowCount;
    }

    const r2Result = await r2BackupRepository.restoreObjects(
      manifest.r2.objects,
      files,
      mode,
    );

    return {
      restoredAt: new Date().toISOString(),
      mode,
      restoredDatabases,
      restoredTables,
      restoredRows,
      uploadedR2Objects: r2Result.uploaded,
      deletedR2Objects: r2Result.deleted,
    };
  }

  /**
   * Restore a backup the module itself created and stored under `.backups/`.
   * The archive is addressed by file name only — nothing is uploaded or edited
   * by hand at any point.
   */
  async restoreSavedBackup(
    fileName: string,
    mode: DevCloudBackupRestoreMode,
    confirmationText: string,
  ): Promise<DevCloudBackupRestoreResult> {
    const backup = await this.readBackup(fileName);
    return this.restore(new Uint8Array(backup.body), mode, confirmationText);
  }
}

export const devCloudBackupService = new DevCloudBackupService();
