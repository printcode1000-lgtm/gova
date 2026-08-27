import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Deterministic content hashes for "did this input change?" decisions.
 *
 * A resumed `deploy:all` may only reuse a previous result when the thing that
 * result was proven against is byte-for-byte the same. A commit SHA alone
 * cannot say that: `deploy:all` runs from a working tree that is still dirty —
 * that is what its publish phase commits — so two runs at the same HEAD can
 * carry different source. Every reuse decision therefore pairs the SHA with a
 * hash of the actual bytes the check reads.
 *
 * The hash is a pure function of file paths and file contents: same tree, same
 * digest, on any machine and in any run. It carries no timestamps, no file
 * modes, no absolute paths, and never reads a value out of the environment, so
 * it can be written to a checkpoint file without leaking anything.
 */
export interface ContentHashRequest {
  /** Absolute directory every include path is resolved against. */
  readonly root: string;
  /** Repository-relative files or directories to hash, in any order. */
  readonly includePaths: readonly string[];
  /** Directory names skipped anywhere in the walk. */
  readonly excludeDirectoryNames?: readonly string[];
  /** Repository-relative files deliberately produced by a later modeled effect. */
  readonly excludePaths?: readonly string[];
}

const DEFAULT_EXCLUDED_DIRECTORY_NAMES: readonly string[] = [
  "node_modules",
  ".next",
  ".git",
  ".turbo",
  ".tmp-static-build",
  "out",
  "dist",
];

function collectFiles(
  absolutePath: string,
  relativePath: string,
  excluded: ReadonlySet<string>,
  collected: Array<{ relativePath: string; absolutePath: string }>,
): void {
  if (!existsSync(absolutePath)) return;
  const stats = statSync(absolutePath);
  if (stats.isFile()) {
    collected.push({ relativePath, absolutePath });
    return;
  }
  if (!stats.isDirectory()) return;
  for (const entry of readdirSync(absolutePath, { withFileTypes: true })) {
    if (entry.isDirectory() && excluded.has(entry.name)) continue;
    collectFiles(
      path.join(absolutePath, entry.name),
      `${relativePath}/${entry.name}`,
      excluded,
      collected,
    );
  }
}

/** Sorted, content-addressed digest of the requested paths. */
export function hashContentPaths(request: ContentHashRequest): string {
  const excluded = new Set([
    ...DEFAULT_EXCLUDED_DIRECTORY_NAMES,
    ...(request.excludeDirectoryNames ?? []),
  ]);
  const collected: Array<{ relativePath: string; absolutePath: string }> = [];
  for (const includePath of [...request.includePaths].sort()) {
    const normalized = includePath.replace(/\\/g, "/").replace(/^\.\//, "");
    collectFiles(path.join(request.root, normalized), normalized, excluded, collected);
  }

  const excludedPaths = new Set(
    (request.excludePaths ?? []).map((entry) => entry.replace(/\\/g, "/").replace(/^\.\//, "")),
  );
  const included = collected.filter((file) => !excludedPaths.has(file.relativePath));

  included.sort((left, right) =>
    left.relativePath < right.relativePath ? -1 : left.relativePath > right.relativePath ? 1 : 0,
  );

  const digest = createHash("sha256");
  for (const file of included) {
    digest.update(file.relativePath);
    digest.update(" ");
    digest.update(createHash("sha256").update(readFileSync(file.absolutePath)).digest());
  }
  return digest.digest("hex");
}

/**
 * The source inputs most shared quality gates read.
 *
 * Deliberately excludes `public/`, `out/` and `services/`: preflight rewrites
 * generated files in those trees as it runs (schema sync rewrites
 * `public/sync_data/*.json`, `build:static` rewrites the web manifest), and a
 * hash that moved every time a generator ran would disable reuse without making
 * anything safer. What the shared gates actually verify is source.
 */
export const SHARED_GATE_SOURCE_PATHS: readonly string[] = [
  "src",
  "packages",
  "scripts",
  "config",
  "package.json",
  "package-lock.json",
  "next.config.ts",
  "tsconfig.json",
  "eslint.config.js",
];

/**
 * Documentation-sensitive gates read docs as source too.
 *
 * `docs:generate` and `architecture:check` validate the knowledge graph and
 * catalogs, so a docs-only edit must invalidate their branch checkpoints even
 * when runtime source stayed byte-identical.
 */
export const DOCUMENTATION_GATE_SOURCE_PATHS: readonly string[] = [
  ...SHARED_GATE_SOURCE_PATHS,
  "docs",
];

const MODELED_PUBLISH_OUTPUT_PATHS: readonly string[] = [
  "config/secret-archive-latest.zip.enc",
  "config/secret-archive-latest.zip.enc.private-key.pem",
];

export function hashSharedGateSources(root: string): string {
  return hashContentPaths({
    root,
    includePaths: SHARED_GATE_SOURCE_PATHS,
    excludePaths: MODELED_PUBLISH_OUTPUT_PATHS,
  });
}

export function hashDocumentationGateSources(root: string): string {
  return hashContentPaths({
    root,
    includePaths: DOCUMENTATION_GATE_SOURCE_PATHS,
    excludePaths: MODELED_PUBLISH_OUTPUT_PATHS,
  });
}

/** Everything uploaded for one isolated service deployment. */
export function hashServiceInputs(root: string, service: string): string {
  return hashContentPaths({
    root,
    includePaths: [`services/${service}`],
    excludeDirectoryNames: ["node_modules", ".next", ".vercel"],
  });
}
