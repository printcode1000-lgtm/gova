import "server-only";

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import type { BuildArtifactDescriptor } from "../domain/build-job-types";

const artifactRoots = [
  path.join("android", "app", "build", "outputs", "bundle", "release"),
  path.join("android", "app", "build", "outputs", "bundle", "releaseNoR8"),
  path.join("android", "app", "build", "outputs", "apk", "release"),
  path.join("android", "app", "build", "outputs", "apk", "releaseNoR8"),
  path.join("android", "app", "build", "outputs", "mapping", "release"),
];

export async function scanBuildJobArtifacts(): Promise<BuildArtifactDescriptor[]> {
  const files: string[] = [];
  for (const relativeRoot of artifactRoots) {
    await collect(path.resolve(relativeRoot), files);
  }
  const manifest = path.resolve("out", "asol-web-manifest.json");
  try {
    const stat = await fs.stat(manifest);
    if (stat.isFile()) files.push(manifest);
  } catch {}

  const artifacts = await Promise.all(files.map(describeFile));
  return artifacts.sort((left, right) => right.mtime.localeCompare(left.mtime));
}

export async function resolveArtifactByName(name: string): Promise<string | null> {
  const artifacts = await scanBuildJobArtifacts();
  const artifact = artifacts.find((item) => item.name === name);
  return artifact ? path.resolve(artifact.path) : null;
}

async function collect(root: string, files: string[]) {
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(root, entry.name);
      if (entry.isDirectory()) await collect(fullPath, files);
      else if (/\.(aab|apk|txt)$/i.test(entry.name)) files.push(fullPath);
    }
  } catch {}
}

async function describeFile(fullPath: string): Promise<BuildArtifactDescriptor> {
  const [stat, bytes] = await Promise.all([fs.stat(fullPath), fs.readFile(fullPath)]);
  const relative = path.relative(process.cwd(), fullPath).replace(/\\/g, "/");
  return {
    name: relative.replace(/[/:\\]/g, "__"),
    path: relative,
    size: stat.size,
    mtime: stat.mtime.toISOString(),
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}
