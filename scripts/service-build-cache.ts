import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { deployAllStateDir, hashServiceInputs } from '@asol/release-core';

/**
 * One build per service per deploy run, parked outside the upload folder.
 *
 * `services:build` and `smoke:services` each build all six services, so a
 * release built twelve times what it deploys six of. The rebuild was not
 * accidental: both steps delete their `.next` on purpose, because the Vercel
 * CLI uploads `services/<name>/` verbatim and a build directory left inside it
 * would be uploaded with it — and `smoke:services` is also expected to work on
 * its own, with no preceding phase.
 *
 * Both properties survive here. The build output is moved *out* of the service
 * folder into `.deploy-all/service-builds/<service>/`, so nothing is ever left
 * where the CLI would find it; and the smoke gate still builds any service it
 * has no matching cache entry for, so running it alone behaves exactly as
 * before.
 *
 * Reuse is keyed on a content hash of the mirrored service folder — the same
 * bytes that would be uploaded — so a mirror re-synced with any change builds
 * again. `.next` is moved rather than copied, and always moved back, so the
 * output exists in exactly one place at any moment.
 */
export interface ServiceBuildManifest {
  readonly service: string;
  readonly inputHash: string;
  readonly builtAt: string;
}

const CACHE_ROOT_NAME = 'service-builds';
const CACHED_BUILD_DIR_NAME = 'next-build';
const MANIFEST_NAME = 'manifest.json';

export function serviceBuildCacheDir(service: string): string {
  return path.join(deployAllStateDir(), CACHE_ROOT_NAME, service);
}

function cachedBuildPath(service: string): string {
  return path.join(serviceBuildCacheDir(service), CACHED_BUILD_DIR_NAME);
}

function manifestPath(service: string): string {
  return path.join(serviceBuildCacheDir(service), MANIFEST_NAME);
}

export function serviceInputHash(root: string, service: string): string {
  return hashServiceInputs(root, service);
}

export function readServiceBuildManifest(service: string): ServiceBuildManifest | undefined {
  const file = manifestPath(service);
  if (!existsSync(file) || !existsSync(cachedBuildPath(service))) return undefined;
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as ServiceBuildManifest;
  } catch {
    return undefined;
  }
}

/** Whether a cached build exists that was produced from exactly these service inputs. */
export function hasReusableServiceBuild(service: string, inputHash: string): boolean {
  const manifest = readServiceBuildManifest(service);
  return Boolean(manifest && inputHash && manifest.inputHash === inputHash);
}

/** Rename across devices is not guaranteed, so fall back to copy-then-remove. */
function moveDirectory(from: string, to: string): void {
  mkdirSync(path.dirname(to), { recursive: true });
  rmSync(to, { recursive: true, force: true });
  try {
    renameSync(from, to);
    return;
  } catch {
    cpSync(from, to, { recursive: true });
    rmSync(from, { recursive: true, force: true });
  }
}

/** Move a fresh `services/<service>/.next` into the cache and record what produced it. */
export function storeServiceBuild(service: string, serviceDir: string, inputHash: string): void {
  const built = path.join(serviceDir, '.next');
  if (!existsSync(built)) return;
  moveDirectory(built, cachedBuildPath(service));
  mkdirSync(serviceBuildCacheDir(service), { recursive: true });
  const manifest: ServiceBuildManifest = {
    service,
    inputHash,
    builtAt: new Date().toISOString(),
  };
  writeFileSync(manifestPath(service), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

/** Move a cached build back into the service folder so it can be started. */
export function restoreServiceBuild(service: string, serviceDir: string, inputHash: string): boolean {
  if (!hasReusableServiceBuild(service, inputHash)) return false;
  moveDirectory(cachedBuildPath(service), path.join(serviceDir, '.next'));
  return true;
}

/**
 * Take the build back out of the service folder.
 *
 * Called from a `finally`, whatever the probe did: the invariant is that no
 * `.next` exists under `services/*` once the step returns, because the deploy
 * that follows uploads those folders as they are.
 */
export function returnServiceBuild(service: string, serviceDir: string, inputHash: string): void {
  const built = path.join(serviceDir, '.next');
  if (!existsSync(built)) return;
  if (!inputHash) {
    rmSync(built, { recursive: true, force: true });
    return;
  }
  storeServiceBuild(service, serviceDir, inputHash);
}

export function discardServiceBuild(service: string): void {
  rmSync(serviceBuildCacheDir(service), { recursive: true, force: true });
}

/** Explicit opt-out of reuse, from the CLI flag or from `deploy:all --service-smoke-rebuild`. */
export function serviceSmokeRebuildRequested(argv: readonly string[] = process.argv.slice(2)): boolean {
  return argv.includes('--rebuild') || process.env.ASOL_SERVICE_SMOKE_REBUILD?.trim() === '1';
}
