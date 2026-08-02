import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export function assertReleaseStaticBundle(manifestPath = path.resolve("out", "asol-web-manifest.json")): void {
  if (!existsSync(manifestPath)) throw new Error(`Static build manifest is missing: ${manifestPath}`);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { diagnostic?: boolean };
  if (manifest.diagnostic) throw new Error("Refusing to copy a diagnostic static build into native assets. Run npm run build:static without --diagnostic.");
}

export function assertCapBuildInputBundle(options: { resume: boolean; skipOta: boolean; dryRun: boolean }, manifestPath?: string): void {
  if (!options.dryRun && (options.resume || options.skipOta)) assertReleaseStaticBundle(manifestPath);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assertReleaseStaticBundle();
  console.log("Static bundle is eligible for native copy.");
}
