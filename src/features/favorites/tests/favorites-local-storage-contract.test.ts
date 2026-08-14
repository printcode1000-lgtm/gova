import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const favoritesRoot = path.join(root, "src/features/favorites");

function filesBelow(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const target = path.join(directory, name);
    return statSync(target).isDirectory() ? filesBelow(target) : [target];
  });
}

const sources = filesBelow(favoritesRoot)
  .filter((file) => /\.(ts|tsx)$/.test(file) && !file.endsWith("favorites-local-storage-contract.test.ts"))
  .map((file) => ({ file, source: readFileSync(file, "utf8") }));

for (const { file, source } of sources) {
  assert.doesNotMatch(source, /\basolApi\b|\bfetch\s*\(|\/api\/favorites/i, `${file} sends favorites over the network.`);
  assert.doesNotMatch(source, /\blocalStorage\b|\bsessionStorage\b/, `${file} bypasses the private AsolDB store.`);
}

const storage = readFileSync(
  path.join(favoritesRoot, "services/favorite-storage.ts"),
  "utf8",
);
assert.match(storage, /ASOL_DB_STORES\.FAVORITES/);
assert.match(storage, /favorites:\$\{scope\}/);

console.log("Favorites device-local storage contract passed.");
