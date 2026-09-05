import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const favoritesRoot = path.resolve(
  new URL(".", import.meta.url).pathname,
  "..",
);

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

const storageSources = sources.filter(({ file }) => path.basename(file) === "favorite-storage.ts");
assert.equal(
  storageSources.length,
  1,
  `Favorites must have exactly one favorite-storage.ts implementation; found ${storageSources.length}.`,
);
const storage = storageSources[0]!.source;
assert.match(storage, /ASOL_DB_STORES\.FAVORITES/);
assert.match(storage, /favorites:\$\{scope\}/);

const provider = sources.find(
  ({ file }) => path.basename(file) === "FavoritesProvider.tsx",
);
assert.ok(provider, "FavoritesProvider.tsx must exist.");
assert.match(
  provider.source,
  /from\s+["'][^"']*favorite-storage["']/,
  "FavoritesProvider must use the package's favorite-storage implementation.",
);

console.log("Favorites device-local storage contract passed.");
