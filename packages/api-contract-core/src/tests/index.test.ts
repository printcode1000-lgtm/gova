import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import {
  TransportKeyContractError,
  assertApiContractFixture,
  assertCamelCaseJsonKeys,
  defineApiContract,
  validateApiContract,
} from "../index";
import { jsonContract, validateRequestBody } from "../server";

assert.doesNotThrow(() =>
  assertCamelCaseJsonKeys({ storeName: "Alpha", nestedItems: [{ ratingAverage: 450 }] }),
);
assert.throws(
  () => assertCamelCaseJsonKeys({ nestedItems: [{ store_name: "legacy" }] }),
  (error: unknown) => error instanceof TransportKeyContractError && error.key === "store_name",
);
assert.doesNotThrow(() =>
  assertCamelCaseJsonKeys(
    { provider_payload: { childValue: 1 } },
    { allowedSnakeCaseKeys: ["provider_payload"], label: "provider protocol fixture" },
  ),
);

const storeContract = defineApiContract("store update", (value) => {
  assert.equal(typeof value, "object");
  assert.ok(value);
  const record = value as Record<string, unknown>;
  assert.equal(typeof record.storeName, "string");
  return { storeName: String(record.storeName) };
});
assert.deepEqual(validateApiContract(storeContract, { storeName: "A" }), { storeName: "A" });
assert.deepEqual(validateRequestBody({ storeName: "B" }, storeContract), { storeName: "B" });
assert.throws(() => validateRequestBody({ store_name: "B" }, storeContract), TransportKeyContractError);
assert.deepEqual(jsonContract({ storeName: "C" }), { storeName: "C" });
assert.doesNotThrow(() => assertApiContractFixture({ storeName: "D" }));

const packageRoot = path.resolve(new URL(".", import.meta.url).pathname, "../..");
const manifest = JSON.parse(readFileSync(path.join(packageRoot, "package.json"), "utf8")) as {
  exports: Record<string, unknown>;
};
assert.deepEqual(Object.keys(manifest.exports).sort(), [".", "./server"]);

function filesBelow(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const target = path.join(directory, name);
    return statSync(target).isDirectory() ? filesBelow(target) : [target];
  });
}
for (const file of filesBelow(path.join(packageRoot, "src")).filter((file) => /\.(ts|tsx)$/.test(file))) {
  const source = readFileSync(file, "utf8");
  assert.doesNotMatch(source, /from\s+["']@\//, `${file} imports application code.`);
  assert.doesNotMatch(source, /from\s+["']@asol\/[^"']+\/src\//, `${file} deep-imports a package.`);
}

console.log("✅ api-contract-core contract passed");
