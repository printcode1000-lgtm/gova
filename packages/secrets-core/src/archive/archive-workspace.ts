import { createHash, randomUUID } from "node:crypto";
import {
  copyFile,
  chmod,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const WORKSPACE_ROOT = process.cwd();
export const MANIFEST_FILE_NAME = "asol-secrets-manifest.json";
export const PORTABLE_ARCHIVE_PATH = path.join(
  WORKSPACE_ROOT,
  "config",
  "secret-archive-latest.zip.enc",
);
export const PORTABLE_RECOVERY_KEY_PATH = `${PORTABLE_ARCHIVE_PATH}.private-key.pem`;
export const BACKUP_STATE_PATH = path.join(
  WORKSPACE_ROOT,
  ".secret-archive",
  "last-backup-state.json",
);

const CONFIG_PATH = path.join(
  WORKSPACE_ROOT,
  "config",
  "secret-backup-paths.json",
);

const EXCLUDED_DIRECTORY_NAMES = new Set([
  ".git",
  ".next",
  ".private-backups",
  "node_modules",
  "out",
  "coverage",
  "worktrees",
]);

const EXCLUDED_RELATIVE_DIRECTORY_PREFIXES = [
  ".claude/worktrees/",
];

export function shouldSkipSecretDiscoveryDirectory(
  name: string,
  relativeDirectory: string,
  nestedGitPresent: boolean,
): boolean {
  if (EXCLUDED_DIRECTORY_NAMES.has(name)) return true;
  const normalized = relativeDirectory.replace(/\\/g, "/").replace(/^\.\//, "");
  if (
    EXCLUDED_RELATIVE_DIRECTORY_PREFIXES.some(
      (prefix) => normalized === prefix.slice(0, -1) || normalized.startsWith(prefix),
    )
  ) {
    return true;
  }
  if (nestedGitPresent && normalized !== "") return true;
  return false;
}

interface SecretPathConfig {
  exactPaths: string[];
  pathPrefixes: string[];
  fileNames: string[];
  extensions: string[];
  namePatterns: string[];
}

export interface SecretManifestEntry {
  path: string;
  sha256: string;
  size: number;
  mode: number;
}

export interface SecretArchiveManifest {
  version: 1;
  createdAt: string;
  workspaceName: string;
  files: SecretManifestEntry[];
}

export interface SecretBackupState {
  version: 1;
  archivePath: string;
  manifest: SecretArchiveManifest;
}

function toPosix(relativePath: string): string {
  return relativePath.split(path.sep).join("/");
}

export function resolveInsideWorkspace(relativePath: string): string {
  const normalized = toPosix(relativePath).replace(/^\.\//, "");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:\//.test(normalized) ||
    normalized.split("/").includes("..")
  ) {
    throw new Error(`Unsafe archive path: ${relativePath}`);
  }
  const resolved = path.resolve(WORKSPACE_ROOT, ...normalized.split("/"));
  const prefix = `${path.resolve(WORKSPACE_ROOT)}${path.sep}`;
  if (!resolved.startsWith(prefix)) {
    throw new Error(`Archive path escapes the workspace: ${relativePath}`);
  }
  return resolved;
}

async function loadConfig(): Promise<SecretPathConfig> {
  return JSON.parse(await readFile(CONFIG_PATH, "utf8")) as SecretPathConfig;
}

function matchesConfig(relativePath: string, config: SecretPathConfig): boolean {
  const normalized = toPosix(relativePath);
  const fileName = path.posix.basename(normalized);
  if (
    normalized === "config/secret-archive-public.pem" ||
    normalized === "config/secret-archive-latest.zip.enc" ||
    normalized === "config/secret-archive-latest.zip.enc.private-key.pem"
  ) return false;
  if (fileName === ".env.example" || fileName.endsWith(".env.example")) {
    return false;
  }
  const extension = path.posix.extname(fileName).toLowerCase();
  return (
    config.exactPaths.includes(normalized) ||
    config.pathPrefixes.some((prefix) => normalized.startsWith(prefix)) ||
    config.fileNames.includes(fileName) ||
    config.extensions.includes(extension) ||
    config.namePatterns.some((pattern) => new RegExp(pattern, "i").test(fileName)) ||
    (normalized.split("/").includes(".vercel") && fileName === "project.json")
  );
}

async function walk(directory: string, files: string[]): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const relativeDirectory = toPosix(path.relative(WORKSPACE_ROOT, absolutePath));
      const nestedGitPresent = existsSync(path.join(absolutePath, ".git"));
      if (shouldSkipSecretDiscoveryDirectory(entry.name, relativeDirectory, nestedGitPresent)) {
        continue;
      }
      await walk(absolutePath, files);
      continue;
    }
    if (entry.isFile()) {
      files.push(toPosix(path.relative(WORKSPACE_ROOT, absolutePath)));
    }
  }
}

export function isGitIgnored(relativePath: string): boolean {
  const result = spawnSync(
    "git",
    ["check-ignore", "-q", "--", relativePath],
    { cwd: WORKSPACE_ROOT, stdio: "ignore" },
  );
  return result.status === 0;
}

export async function collectIgnoredSecretFiles(): Promise<{
  included: string[];
  sensitiveButTracked: string[];
}> {
  const config = await loadConfig();
  const files: string[] = [];
  await walk(WORKSPACE_ROOT, files);
  const candidates = files.filter((file) => matchesConfig(file, config));
  return {
    included: candidates.filter(isGitIgnored).sort(),
    sensitiveButTracked: candidates.filter((file) => !isGitIgnored(file)).sort(),
  };
}

export async function sha256File(filePath: string): Promise<string> {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

export async function resolveRestoreArchivePath(
  portableArchivePath = PORTABLE_ARCHIVE_PATH,
): Promise<string> {
  if (existsSync(portableArchivePath)) return portableArchivePath;
  throw new Error(
    "No current secret archive exists in config/secret-archive-latest.zip.enc.",
  );
}

export async function createManifest(
  relativePaths: string[],
): Promise<SecretArchiveManifest> {
  const files = await Promise.all(
    relativePaths.map(async (relativePath) => {
      const absolutePath = resolveInsideWorkspace(relativePath);
      const metadata = await stat(absolutePath);
      return {
        path: relativePath,
        sha256: await sha256File(absolutePath),
        size: metadata.size,
        mode: metadata.mode,
      };
    }),
  );
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    workspaceName: path.basename(WORKSPACE_ROOT),
    files,
  };
}

function comparableFiles(manifest: SecretArchiveManifest): SecretManifestEntry[] {
  return [...manifest.files]
    .map((entry) => ({
      path: entry.path,
      sha256: entry.sha256,
      size: entry.size,
      mode: entry.mode,
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

export function manifestsContainSameFiles(
  current: SecretArchiveManifest,
  previous: SecretArchiveManifest,
): boolean {
  return (
    previous.version === 1 &&
    JSON.stringify(comparableFiles(current)) ===
      JSON.stringify(comparableFiles(previous))
  );
}

export async function readLastBackupState(): Promise<SecretBackupState | null> {
  try {
    const state = JSON.parse(
      await readFile(BACKUP_STATE_PATH, "utf8"),
    ) as SecretBackupState;
    return state.version === 1 &&
      typeof state.archivePath === "string" &&
      state.manifest?.version === 1 &&
      Array.isArray(state.manifest.files)
      ? state
      : null;
  } catch {
    return null;
  }
}

export async function writeLastBackupState(
  manifest: SecretArchiveManifest,
  archivePath: string,
): Promise<void> {
  await mkdir(path.dirname(BACKUP_STATE_PATH), { recursive: true });
  const temporaryPath = `${BACKUP_STATE_PATH}.${randomUUID()}.tmp`;
  const state: SecretBackupState = {
    version: 1,
    archivePath: path.resolve(archivePath),
    manifest,
  };
  await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
  try {
    await rename(temporaryPath, BACKUP_STATE_PATH);
  } catch {
    await rm(BACKUP_STATE_PATH, { force: true });
    await rename(temporaryPath, BACKUP_STATE_PATH);
  }
}

export function findSevenZip(): string {
  const programFiles = process.env.ProgramFiles;
  const candidates = [
    programFiles ? path.join(programFiles, "7-Zip", "7z.exe") : "",
    "7z",
    "7zz",
    "7za",
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (path.isAbsolute(candidate) && !existsSync(candidate)) continue;
    const result = spawnSync(candidate, [], { stdio: "ignore" });
    if (!result.error) return candidate;
  }
  throw new Error(
    "7-Zip was not found. Install 7-Zip and make 7z available before using the secret archive commands.",
  );
}

export function runSevenZip(executable: string, args: string[]): void {
  const result = spawnSync(executable, args, {
    cwd: WORKSPACE_ROOT,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`7-Zip exited with code ${result.status ?? "unknown"}.`);
  }
}

export function listArchivePaths(
  executable: string,
  archivePath: string,
): string[] {
  const result = spawnSync(executable, ["l", "-slt", archivePath], {
    cwd: WORKSPACE_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("Could not inspect the archive.");
  return result.stdout
    .split(/\r?\n/)
    .filter((line) => line.startsWith("Path = "))
    .map((line) => line.slice("Path = ".length).trim())
    .filter((entry) => path.resolve(entry) !== path.resolve(archivePath));
}

export function assertEncryptedArchive(
  executable: string,
  archivePath: string,
): void {
  const result = spawnSync(executable, ["l", "-slt", archivePath], {
    cwd: WORKSPACE_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  if (result.error) throw result.error;
  if (result.status !== 0 || !result.stdout.includes("Encrypted = +")) {
    throw new Error("The generated archive is not encrypted; it has been rejected.");
  }
}

export async function writeTemporaryManifest(
  manifest: SecretArchiveManifest,
): Promise<string> {
  const manifestPath = path.join(WORKSPACE_ROOT, MANIFEST_FILE_NAME);
  const handle = await open(manifestPath, "wx");
  try {
    await handle.writeFile(`${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  } finally {
    await handle.close();
  }
  return manifestPath;
}

export async function createTemporaryListFile(entries: string[]): Promise<string> {
  const listPath = path.join(os.tmpdir(), `asol-secret-files-${randomUUID()}.txt`);
  await writeFile(listPath, `${entries.join("\n")}\n`, "utf8");
  return listPath;
}

export async function removeTemporaryPath(target: string): Promise<void> {
  await rm(target, { recursive: true, force: true });
}

export async function createRestoreDirectory(): Promise<string> {
  const directory = path.join(os.tmpdir(), `asol-secrets-restore-${randomUUID()}`);
  await mkdir(directory, { recursive: false });
  return directory;
}

export async function restoreManifestFiles(
  manifest: SecretArchiveManifest,
  extractedRoot: string,
): Promise<number> {
  if (manifest.version !== 1 || !Array.isArray(manifest.files)) {
    throw new Error("Unsupported or invalid secret archive manifest.");
  }

  for (const entry of manifest.files) {
    const destination = resolveInsideWorkspace(entry.path);
    if (!isGitIgnored(entry.path)) {
      throw new Error(
        `Refusing to restore ${entry.path} because Git does not currently ignore it.`,
      );
    }
    const source = path.resolve(extractedRoot, ...entry.path.split("/"));
    const extractedPrefix = `${path.resolve(extractedRoot)}${path.sep}`;
    if (!source.startsWith(extractedPrefix) || !existsSync(source)) {
      throw new Error(`Archive is missing ${entry.path}.`);
    }
    const actualHash = await sha256File(source);
    if (actualHash !== entry.sha256) {
      throw new Error(`Checksum verification failed for ${entry.path}.`);
    }
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(source, destination);
    if (Number.isInteger(entry.mode)) await chmod(destination, entry.mode);
  }
  return manifest.files.length;
}
