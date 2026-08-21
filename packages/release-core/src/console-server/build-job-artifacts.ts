import "server-only";

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

import type { BuildArtifactDescriptor, BuildJobRecord } from "../console";

const workspaceRoot = path.resolve(/* turbopackIgnore: true */ process.cwd());
const cachePath = path.join(workspaceRoot, ".backups", "build-jobs", "artifact-descriptors.json");
const staticExportRoot = path.join(/* turbopackIgnore: true */ workspaceRoot, "out");

/** Roots an artifact may be served from. Also the download path guard. */
export const artifactRoots = [
  path.join(workspaceRoot, "android", "app", "build", "outputs", "bundle"),
  path.join(workspaceRoot, "android", "app", "build", "outputs", "apk"),
  path.join(workspaceRoot, "android", "app", "build", "outputs", "mapping"),
  staticExportRoot,
];

/** Trees walked when looking for what a job produced. */
const scannedRoots = artifactRoots.filter((root) => root !== staticExportRoot);

/**
 * The only file under `out/` that is an artifact.
 *
 * `out/` is the static web export: a full rebuild rewrites thousands of `.json`
 * and `.txt` files inside it, none of which anyone downloads from a job card.
 * Walking it made every Android build hash ~2300 web files — serially, each one
 * re-reading and rewriting the whole descriptor cache — and the job sat in
 * `finalizing-results` long after the APK was on disk. Only the manifest is
 * named by a command's `expectedArtifacts`, so only the manifest is collected.
 */
const webManifestPath = path.join(staticExportRoot, "asol-web-manifest.json");

type ArtifactSnapshot = Record<string, { size: number; mtimeMs: number }>;
type DescriptorCache = Record<string, BuildArtifactDescriptor>;

export async function snapshotBuildOutputs(): Promise<ArtifactSnapshot> {
  const files = await collectArtifactFiles();
  const snapshot: ArtifactSnapshot = {};
  await Promise.all(files.map(async (fullPath) => {
    const stat = await statOrNull(fullPath);
    if (stat) snapshot[toRelative(fullPath)] = { size: stat.size, mtimeMs: stat.mtimeMs };
  }));
  return snapshot;
}

export async function changedBuildArtifacts(before: ArtifactSnapshot): Promise<BuildArtifactDescriptor[]> {
  const files = await collectArtifactFiles();
  const changed: string[] = [];
  for (const fullPath of files) {
    const stat = await statOrNull(fullPath);
    // A build writes and deletes as it goes, so a path listed a moment ago can
    // be gone by the time it is measured. That used to throw out of `finalize`,
    // where nothing catches it: the record stayed `running` for ever and the
    // job never reported the result it had already produced.
    if (!stat) continue;
    const previous = before[toRelative(fullPath)];
    if (!previous || previous.size !== stat.size || previous.mtimeMs !== stat.mtimeMs) changed.push(fullPath);
  }

  // The descriptor cache is read once and written once per job. Reading and
  // rewriting it around every single file made the cost quadratic in the number
  // of changed artifacts, which is what left finished builds "running".
  const cache = await readCache();
  let hashedAny = false;
  const artifacts: BuildArtifactDescriptor[] = [];
  for (const fullPath of changed) {
    const described = await describeFile(fullPath, cache);
    if (!described) continue;
    hashedAny ||= described.hashed;
    artifacts.push(described.descriptor);
  }
  if (hashedAny) await writeCache(cache);
  return artifacts.sort((left, right) => right.mtime.localeCompare(left.mtime));
}

export async function resolveStoredArtifact(record: BuildJobRecord, name: string): Promise<{ descriptor: BuildArtifactDescriptor; fullPath: string } | null> {
  const descriptor = record.artifacts?.find((artifact) => artifact.name === name);
  if (!descriptor) return null;
  const fullPath = path.resolve(/* turbopackIgnore: true */ workspaceRoot, descriptor.path);
  if (!isInsideAllowedRoot(fullPath)) throw new Error("releaseArtifactPathInvalid");
  let stat;
  try { stat = await fs.stat(fullPath); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  if (!stat?.isFile()) return null;
  if (stat.size !== descriptor.size || stat.mtime.toISOString() !== descriptor.mtime) throw new Error("releaseArtifactChangedAfterJob");
  return { descriptor, fullPath };
}

export function isInsideAllowedRoot(candidate: string): boolean {
  const resolved = path.resolve(candidate);
  return artifactRoots.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`));
}

async function collectArtifactFiles(): Promise<string[]> {
  const files: string[] = [];
  for (const root of scannedRoots) await collect(root, files);
  if (await statOrNull(webManifestPath)) files.push(webManifestPath);
  return files;
}

async function collect(root: string, files: string[]): Promise<void> {
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(root, entry.name);
      if (entry.isDirectory()) await collect(fullPath, files);
      else if (/\.(aab|apk|txt|json)$/i.test(entry.name)) files.push(fullPath);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

/**
 * @returns the descriptor and whether it was newly hashed, so the caller can
 * write the cache once instead of once per file. `null` when the file vanished.
 */
async function describeFile(
  fullPath: string,
  cache: DescriptorCache,
): Promise<{ descriptor: BuildArtifactDescriptor; hashed: boolean } | null> {
  const stat = await statOrNull(fullPath);
  if (!stat) return null;
  const relative = toRelative(fullPath);
  const key = `${relative}|${stat.mtimeMs}|${stat.size}`;
  const cached = cache[key];
  if (cached) return { descriptor: cached, hashed: false };
  const descriptor: BuildArtifactDescriptor = {
    name: Buffer.from(relative, "utf8").toString("base64url"),
    path: relative,
    size: stat.size,
    mtime: stat.mtime.toISOString(),
    sha256: await streamSha256(fullPath),
  };
  cache[key] = descriptor;
  return { descriptor, hashed: true };
}

async function statOrNull(fullPath: string) {
  try {
    return await fs.stat(fullPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function streamSha256(fullPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(fullPath);
    stream.on("error", reject);
    hash.on("error", reject);
    hash.on("finish", () => resolve(hash.digest("hex")));
    stream.pipe(hash);
  });
}

async function readCache(): Promise<DescriptorCache> {
  try {
    return JSON.parse(await fs.readFile(cachePath, "utf8")) as DescriptorCache;
  } catch {
    return {};
  }
}

async function writeCache(cache: DescriptorCache): Promise<void> {
  await fs.mkdir(path.dirname(cachePath), { recursive: true });
  await fs.writeFile(cachePath, JSON.stringify(cache), "utf8");
}

function toRelative(fullPath: string): string {
  return path.relative(workspaceRoot, fullPath).replace(/\\/g, "/");
}
