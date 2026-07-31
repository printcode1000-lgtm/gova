import assert from "node:assert/strict";
import {
  R2_STORAGE_TARGETS,
  assertR2StorageTarget,
} from "../src/core/config/r2-storage-topology";

assert.doesNotThrow(() => {
  assertR2StorageTarget("general", R2_STORAGE_TARGETS.general);
  assertR2StorageTarget("products", R2_STORAGE_TARGETS.products);
});

assert.throws(
  () => assertR2StorageTarget("general", R2_STORAGE_TARGETS.products),
  /r2StorageTargetMismatch:general:accountId,endpoint,bucketName,publicUrl/,
);

assert.throws(
  () =>
    assertR2StorageTarget("general", {
      ...R2_STORAGE_TARGETS.general,
      publicUrl: R2_STORAGE_TARGETS.products.publicUrl,
    }),
  /r2StorageTargetMismatch:general:publicUrl/,
);

console.log("R2 storage topology checks passed");
