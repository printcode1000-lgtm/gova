import assert from "node:assert/strict";
import { existsSync } from "node:fs";

import dotenv from "dotenv";

import { discoverTursoBackupSources } from "@/modules/data-access/domains/dev-cloud-backup/repositories/turso-backup.repository.server";
import {
  assertDevCloudBackupAllowed,
  devCloudBackupEnvironment,
} from "../domain/development-guard.server";
import { r2BackupRepository } from "../repositories/r2-backup.repository.server";

const original = {
  nodeEnv: process.env.NODE_ENV,
  nextPhase: process.env.NEXT_PHASE,
  publicMode: process.env.NEXT_PUBLIC_ASOL_MODE,
  vercel: process.env.VERCEL,
};

function setEnv(values: Partial<typeof original>) {
  process.env.NODE_ENV = values.nodeEnv;
  if (values.nextPhase === undefined) delete process.env.NEXT_PHASE;
  else process.env.NEXT_PHASE = values.nextPhase;
  if (values.publicMode === undefined) delete process.env.NEXT_PUBLIC_ASOL_MODE;
  else process.env.NEXT_PUBLIC_ASOL_MODE = values.publicMode;
  if (values.vercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = values.vercel;
}

try {
  setEnv({
    nodeEnv: "development",
    nextPhase: undefined,
    publicMode: undefined,
    vercel: undefined,
  });
  assert.equal(devCloudBackupEnvironment().allowed, true);
  assert.doesNotThrow(() => assertDevCloudBackupAllowed());

  setEnv({
    nodeEnv: "production",
    nextPhase: undefined,
    publicMode: undefined,
    vercel: undefined,
  });
  assert.equal(devCloudBackupEnvironment().allowed, false);
  assert.throws(() => assertDevCloudBackupAllowed(), /devCloudBackupDevelopmentOnly/);

  setEnv({
    nodeEnv: "development",
    nextPhase: undefined,
    publicMode: "static",
    vercel: undefined,
  });
  assert.equal(devCloudBackupEnvironment().allowed, false);

  // R2 admits no exclusions: the only prefix is the whole bucket.
  assert.deepEqual(
    r2BackupRepository.prefixes(),
    [""],
    "R2 backup must cover every object with no prefix filtering",
  );

  // Database coverage must be exhaustive: every libsql database reachable from
  // the environment has to appear in the backup sources, or a database could be
  // silently left out of every backup.
  // Loaded only now: .env sets ASOL_MODE, which would flip the guard above.
  if (existsSync(".env")) dotenv.config({ path: ".env" });
  if (existsSync(".env.local")) dotenv.config({ path: ".env.local" });
  const sourceUrlKeys = new Set(
    discoverTursoBackupSources().map((source) => source.urlKey),
  );
  const environmentUrlKeys = Object.keys(process.env).filter(
    (key) =>
      key.endsWith("_DATABASE_URL") &&
      (process.env[key] ?? "").trim().startsWith("libsql://"),
  );
  const uncovered = environmentUrlKeys.filter((key) => !sourceUrlKeys.has(key));
  assert.deepEqual(
    uncovered,
    [],
    `these databases would never be backed up: ${uncovered.join(", ")}`,
  );

  console.log(
    `dev-cloud-backup policy: guard, full-bucket R2 scope, and ${sourceUrlKeys.size} database sources verified`,
  );
} finally {
  setEnv(original);
}
