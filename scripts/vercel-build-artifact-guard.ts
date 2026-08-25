import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

function requireNonEmptyFile(root: string, relativePath: string): void {
  const filePath = path.join(root, relativePath);
  if (!existsSync(filePath) || !statSync(filePath).isFile() || statSync(filePath).size === 0) {
    throw new Error(`Vercel build artifact is missing required file: ${relativePath}.`);
  }
}

function requireJsonObject(root: string, relativePath: string): void {
  requireNonEmptyFile(root, relativePath);
  const value = JSON.parse(readFileSync(path.join(root, relativePath), "utf8")) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Vercel build artifact contains invalid JSON object: ${relativePath}.`);
  }
}

/** Proves the hosted build emitted the minimum server artifact Vercel runs. */
export function assertVercelBuildArtifact(root = process.cwd()): void {
  const appDirectory = path.join(root, ".next", "server", "app");
  if (!existsSync(appDirectory) || !statSync(appDirectory).isDirectory()) {
    throw new Error("Vercel build artifact is missing .next/server/app.");
  }
  requireNonEmptyFile(root, path.join(".next", "BUILD_ID"));
  requireJsonObject(root, path.join(".next", "routes-manifest.json"));
  requireJsonObject(root, path.join(".next", "required-server-files.json"));
  requireJsonObject(root, path.join(".next", "server", "app", "page.js.nft.json"));
}
