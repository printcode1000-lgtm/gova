import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { deployAllStateDir } from "./state";
import { hashServiceInputs } from "./input-hash";

export interface ServiceBuildManifest { readonly service: string; readonly inputHash: string; readonly builtAt: string; }
const CACHE_ROOT_NAME = "service-builds";
const CACHED_BUILD_DIR_NAME = "next-build";
const MANIFEST_NAME = "manifest.json";
export function serviceBuildCacheDir(service: string): string { return path.join(deployAllStateDir(), CACHE_ROOT_NAME, service); }
function cachedBuildPath(service: string): string { return path.join(serviceBuildCacheDir(service), CACHED_BUILD_DIR_NAME); }
function manifestPath(service: string): string { return path.join(serviceBuildCacheDir(service), MANIFEST_NAME); }
export function serviceInputHash(root: string, service: string): string { return hashServiceInputs(root, service); }
export function readServiceBuildManifest(service: string): ServiceBuildManifest | undefined {
  const file = manifestPath(service);
  if (!existsSync(file) || !existsSync(cachedBuildPath(service))) return undefined;
  try { return JSON.parse(readFileSync(file, "utf8")) as ServiceBuildManifest; } catch { return undefined; }
}
export function hasReusableServiceBuild(service: string, inputHash: string): boolean {
  const manifest = readServiceBuildManifest(service);
  return Boolean(manifest && inputHash && manifest.inputHash === inputHash);
}
function moveDirectory(from: string, to: string): void {
  mkdirSync(path.dirname(to), { recursive: true }); rmSync(to, { recursive: true, force: true });
  try { renameSync(from, to); } catch { cpSync(from, to, { recursive: true }); rmSync(from, { recursive: true, force: true }); }
}
export function storeServiceBuild(service: string, serviceDir: string, inputHash: string): void {
  const built = path.join(serviceDir, ".next"); if (!existsSync(built)) return;
  moveDirectory(built, cachedBuildPath(service)); mkdirSync(serviceBuildCacheDir(service), { recursive: true });
  writeFileSync(manifestPath(service), `${JSON.stringify({ service, inputHash, builtAt: new Date().toISOString() }, null, 2)}\n`, "utf8");
}
export function restoreServiceBuild(service: string, serviceDir: string, inputHash: string): boolean {
  if (!hasReusableServiceBuild(service, inputHash)) return false; moveDirectory(cachedBuildPath(service), path.join(serviceDir, ".next")); return true;
}
export function returnServiceBuild(service: string, serviceDir: string, inputHash: string): void {
  const built = path.join(serviceDir, ".next"); if (!existsSync(built)) return;
  if (!inputHash) { rmSync(built, { recursive: true, force: true }); return; } storeServiceBuild(service, serviceDir, inputHash);
}
export function discardServiceBuild(service: string): void { rmSync(serviceBuildCacheDir(service), { recursive: true, force: true }); }
export function serviceSmokeRebuildRequested(argv: readonly string[] = process.argv.slice(2)): boolean {
  return argv.includes("--rebuild") || process.env.ASOL_SERVICE_SMOKE_REBUILD?.trim() === "1";
}
