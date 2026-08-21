import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { strToU8, zipSync } from "fflate";

import {
  DEV_CLOUD_BACKUP_MANIFEST_VERSION,
  devCloudBackupRestoreConfirmation,
  type DevCloudBackupManifest,
} from "../index";
import { backupStoragePrefixes, DevCloudBackupService } from "../server";

const manifestFile = JSON.parse(
  readFileSync(path.join(process.cwd(), "packages/backup-core/package.json"), "utf8"),
) as { exports: Record<string, unknown> };
assert.deepEqual(Object.keys(manifestFile.exports), [".", "./server"]);
assert.deepEqual(backupStoragePrefixes(), [""], "Every R2 object remains inside backup scope.");
assert.equal(devCloudBackupRestoreConfirmation("replace"), "RESTORE_DEV_CLOUD_BACKUP_REPLACE");

let allowedChecks = 0;
const service = new DevCloudBackupService({
  assertAllowed() {
    allowedChecks += 1;
  },
  environment: () => ({
    allowed: true,
    nodeEnv: "development",
    publicMode: "",
    vercel: false,
  }),
  database: {
    sources: () => [],
    exportDatabase: async () => {
      throw new Error("unreachable");
    },
    restoreDatabase: async () => ({ tableCount: 0, rowCount: 0 }),
  },
});

const manifest: DevCloudBackupManifest = {
  manifestVersion: DEV_CLOUD_BACKUP_MANIFEST_VERSION,
  createdByModuleVersion: "test",
  backupId: "backup-1",
  createdAt: "2026-08-20T00:00:00.000Z",
  environment: "development",
  databases: [],
  r2: { bucketNames: {}, objectCount: 0, totalBytes: 0, objects: [], prefixes: [""] },
};
const archive = zipSync({ "manifest.json": strToU8(JSON.stringify(manifest)) });
assert.equal(service.inspectZip(archive).manifest.backupId, "backup-1");
assert.equal(allowedChecks, 1, "Archive inspection must pass through the destructive-tool guard.");

const denied = new DevCloudBackupService({
  assertAllowed() {
    throw new Error("denied");
  },
  environment: () => ({ allowed: false, nodeEnv: "production", publicMode: "", vercel: true }),
  database: {
    sources: () => [],
    exportDatabase: async () => { throw new Error("unreachable"); },
    restoreDatabase: async () => { throw new Error("unreachable"); },
  },
});
assert.throws(() => denied.inspectZip(archive), /denied/, "A missing/denied seam fails closed.");

for (const file of ["domain/types.ts", "index.ts"]) {
  const text = readFileSync(path.join(process.cwd(), "packages/backup-core/src", file), "utf8");
  assert.doesNotMatch(text, /(?:node:|server-only|@\/|@asol\/)/, `${file} must stay browser-safe`);
}

const serverSource = readFileSync(
  path.join(process.cwd(), "packages/backup-core/src/server/dev-cloud-backup-service.ts"),
  "utf8",
);
assert.doesNotMatch(serverSource, /@\/|@asol\/data-core/, "The core must receive database access by port.");

console.log("@asol/backup-core contract: 2 doors, archive validation and fail-closed database port verified.");
