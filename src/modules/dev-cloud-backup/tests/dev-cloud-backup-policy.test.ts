import assert from "node:assert/strict";

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

  const prefixes = r2BackupRepository.prefixesForScope("known-project-files");
  assert.ok(prefixes.length > 0, "known project R2 backup prefixes are missing");
  assert.ok(
    prefixes.every((prefix) => prefix.startsWith("images/") && prefix.endsWith("/")),
    `unexpected R2 backup prefixes: ${prefixes.join(", ")}`,
  );

  assert.deepEqual(r2BackupRepository.prefixesForScope("all-r2"), [""]);
  console.log("dev-cloud-backup policy: environment guard and R2 scope verified");
} finally {
  setEnv(original);
}
