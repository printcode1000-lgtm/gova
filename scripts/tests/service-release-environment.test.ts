import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { createServiceReleaseEnvironment } from "../service-release-environment";

const cwd = mkdtempSync(path.join(os.tmpdir(), "gova-service-release-env-"));
try {
  writeFileSync(
    path.join(cwd, ".env.local"),
    [
      "TURSO_PRODUCT_DATABASE_URL=from-file",
      "TURSO_PRODUCT_AUTH_TOKEN=file-token",
      "ASOL_MODE=static",
      "NEXT_PUBLIC_ASOL_MODE=static",
      "",
    ].join("\n"),
  );

  const baseEnv: NodeJS.ProcessEnv = {
    TURSO_PRODUCT_AUTH_TOKEN: "process-token",
    ASOL_MODE: "static",
    NEXT_PUBLIC_ASOL_MODE: "static",
  };
  const env = createServiceReleaseEnvironment(cwd, baseEnv);

  assert.equal(env.TURSO_PRODUCT_DATABASE_URL, "from-file");
  assert.equal(env.TURSO_PRODUCT_AUTH_TOKEN, "process-token");
  assert.equal(env.ASOL_MODE, undefined);
  assert.equal(env.NEXT_PUBLIC_ASOL_MODE, undefined);
  assert.equal(baseEnv.ASOL_MODE, "static");
  assert.equal(baseEnv.NEXT_PUBLIC_ASOL_MODE, "static");
  assert.equal(baseEnv.TURSO_PRODUCT_DATABASE_URL, undefined);
  console.log("service release environment: PASS");
} finally {
  rmSync(cwd, { recursive: true, force: true });
}
