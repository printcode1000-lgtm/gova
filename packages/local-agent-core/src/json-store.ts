import { mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Owner-only JSON persistence for the coordination channel.
 *
 * Every record is written through a temporary file and renamed into place so a
 * concurrent reader never observes a half-written document, and every file is
 * created 0600 under a 0700 directory so runner state stays private to the
 * machine user.
 */

export const DIRECTORY_MODE = 0o700;
export const FILE_MODE = 0o600;

export function ensureDir(dir: string): string {
  mkdirSync(dir, { recursive: true, mode: DIRECTORY_MODE });
  return dir;
}

export function writeJsonFile(filePath: string, value: unknown): void {
  ensureDir(path.dirname(filePath));
  const temporary = `${filePath}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: FILE_MODE });
  renameSync(temporary, filePath);
}

export function readJsonFile<T>(filePath: string): T | null {
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

export function listJsonFiles(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((name) => name.endsWith(".json"))
      .sort()
      .map((name) => path.join(dir, name));
  } catch {
    return [];
  }
}

export function readJsonDir<T>(dir: string): T[] {
  return listJsonFiles(dir)
    .map((filePath) => readJsonFile<T>(filePath))
    .filter((value): value is T => value !== null);
}

/** Filesystem-safe identifier fragment: keeps records addressable by name. */
export function safeIdentifier(value: string, maxLength = 64): string {
  return value.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, maxLength);
}
