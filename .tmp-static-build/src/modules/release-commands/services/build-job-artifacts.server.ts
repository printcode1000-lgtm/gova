import "server-only";

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

import type { BuildArtifactDescriptor, BuildJobRecord } from "../domain/build-job-types";

const workspaceRoot = path.resolve(process.cwd());
const cachePath = path.join(workspaceRoot, ".backups", "build-jobs", "artifact-descriptors.json");
export const artifactRoots = [
  path.join(workspaceRoot, "android", "app", "build", "outputs", "bundle"),
  path.join(workspaceRoot, "android", "app", "build", "outputs", "apk"),
  path.join(workspaceRoot, "android", "app", "build", "outputs", "mapping"),
  path.join(workspaceRoot, "out"),
];

type ArtifactSnapshot = Record<string, { size: number; mtimeMs: number }>;
type DescriptorCache = Record<string, BuildArtifactDescriptor>;

export async function snapshotBuildOutputs(): Promise<ArtifactSnapshot> {
  const files = await collectArtifactFiles();
  const snapshot: ArtifactSnapshot = {};
  await Promise.all(files.map(async (fullPath) => {
    const stat = await fs.stat(fullPath);
    snapshot[toRelative(fullPath)] = { size: stat.size, mtimeMs: stat.mtimeMs };
  }));
  return snapshot;
}

export async function changedBuildArtifacts(before: ArtifactSnapshot): Promise<BuildArtifactDescriptor[]> {
  const files = await collectArtifactFiles();
  const changed: string[] = [];
  for (const fullPath of files) {
    const stat = await fs.stat(fullPath);
    const previous = before[toRelative(fullPath)];
    if (!previous || previous.size !== stat.size || previous.mtimeMs !== stat.mtimeMs) changed.push(fullPath);
  }
  const artifacts: BuildArtifactDescriptor[] = [];
  for (const fullPath of changed) artifacts.push(await describeFile(fullPath));
  return artifacts.sort((left, right) => right.mtime.localeCompare(left.mtime));
}

export async function resolveStoredArtifact(record: BuildJobRecord, name: string): Promise<{ descriptor: BuildArtifactDescriptor; fullPath: string } | null> {
  const descriptor = record.artifacts?.find((artifact) => artifact.name === name);
  if (!descriptor) return null;
  const fullPath = path.resolve(workspaceRoot, descriptor.path);
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
  for (const root of artifactRoots) await collect(root, files);
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

async function describeFile(fullPath: string): Promise<BuildArtifactDescriptor> {
  const stat = await fs.stat(fullPath);
  const relative = toRelative(fullPath);
  const key = `${relative}|${stat.mtimeMs}|${stat.size}`;
  const cache = await readCache();
  if (cache[key]) return cache[key];
  const descriptor: BuildArtifactDescriptor = {
    name: Buffer.from(relative, "utf8").toString("base64url"),
    path: relative,
    size: stat.size,
    mtime: stat.mtime.toISOString(),
    sha256: await streamSha256(fullPath),
  };
  cache[key] = descriptor;
  await fs.mkdir(path.dirname(cachePath), { recursive: true });
  await fs.writeFile(cachePath, JSON.stringify(cache), "utf8");
  return descriptor;
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

function toRelative(fullPath: string): string {
  return path.relative(workspaceRoot, fullPath).replace(/\\/g, "/");
}
