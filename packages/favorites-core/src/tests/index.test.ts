import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import "./favorite-collection.test";
import "./favorites-local-storage-contract.test";

const packageRoot = path.resolve(new URL(".", import.meta.url).pathname, "../..");

function filesBelow(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const target = path.join(directory, name);
    return statSync(target).isDirectory() ? filesBelow(target) : [target];
  });
}

const sources = filesBelow(path.join(packageRoot, "src")).filter((file) =>
  /\.(ts|tsx)$/.test(file),
);

for (const file of sources) {
  const source = readFileSync(file, "utf8");
  assert.doesNotMatch(
    source,
    /from\s+["']@\//,
    `${file} imports the application (@/). Favorites core must stay app-free.`,
  );
  assert.doesNotMatch(
    source,
    /from\s+["']@asol\/[^"']+\/src\//,
    `${file} deep-imports another package instead of a declared door.`,
  );
  assert.doesNotMatch(
    source,
    /from\s+["'](?:\.\.\/)+packages\//,
    `${file} reaches a package through a relative path.`,
  );
}

const manifest = JSON.parse(
  readFileSync(path.join(packageRoot, "package.json"), "utf8"),
) as { exports: Record<string, unknown> };
assert.deepEqual(
  Object.keys(manifest.exports).sort(),
  [".", "./ui"],
  "favorites-core must expose exactly the `.` and `./ui` doors.",
);

const cardUiImports = sources
  .filter((file) => !file.includes(`${path.sep}tests${path.sep}`))
  .filter((file) =>
    /from\s+["']@asol\/(?:seller|product)-card-core\/ui["']/.test(readFileSync(file, "utf8")),
  );
assert.deepEqual(
  cardUiImports,
  [],
  "Favorites core must not render card UI; hosts pass the favorite control as a slot.",
);

console.log("✅ favorites-core boundary contract passed");
