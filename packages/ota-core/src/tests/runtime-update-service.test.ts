import assert from "node:assert/strict";
import { otaUpdateService } from "../index";

export async function runRuntimeUpdateServiceTests(): Promise<void> {
  assert.equal(typeof otaUpdateService.isEnabled, "function");
  assert.equal(typeof otaUpdateService.getState, "function");
  assert.equal(typeof otaUpdateService.getPending, "function");
  assert.equal(typeof otaUpdateService.enforceRevocations, "function");
  assert.equal(typeof otaUpdateService.confirmRunningBundle, "function");
  assert.equal(typeof otaUpdateService.activatePending, "function");
  assert.equal(typeof otaUpdateService.checkAndDownload, "function");
  assert.equal(typeof otaUpdateService.checkDailyAndDownload, "function");
  assert.equal(typeof otaUpdateService.prepareAtSplash, "function");

  const isEnabled = otaUpdateService.isEnabled();
  assert.equal(typeof isEnabled, "boolean");

  console.log("  ✔ runtime-update-service integration tests passed");
}

if (process.argv[1]?.endsWith("runtime-update-service.test.ts")) {
  runRuntimeUpdateServiceTests().catch((e) => { console.error(e); process.exit(1); });
}
