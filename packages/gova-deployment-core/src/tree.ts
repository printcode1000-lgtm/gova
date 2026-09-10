import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import ts from "typescript";

/**
 * The gova deployment build view.
 *
 * gova is the only GitHub-linked Vercel project, so its build compiles whatever
 * the repository contains. The canonical Business API handlers have to stay real
 * in the repository — the service mirrors are generated from them — which means
 * the isolation cannot be done by editing those handlers into stubs. It is done
 * here instead: a deterministic copy of the repository with the route trees gova
 * no longer implements left out, so Vercel never compiles a function for them.
 *
 * This is a build view, not a fork. Nothing is rewritten; whole directories are
 * either present or absent, and the manifest records exactly which.
 */
/**
 * The view is written to a transient build directory, not a tracked sibling.
 *
 * It is a full copy of the repository, so a persistent one would give every
 * repository-wide scanner a second copy of every file to walk and report on.
 * `.tmp-gova-build` matches `.tmp-static-build`, which exists for the same
 * reason and only for the length of a build.
 */
export const GOVA_DEPLOYMENT_DIR = ".tmp-gova-build";

/** The upload view is itself the Vercel project root, never the full checkout. */
const GOVA_UPLOAD_VERCEL_CONFIG = {
  $schema: "https://openapi.vercel.sh/vercel.json",
  installCommand: "npm ci",
  buildCommand: "npm run build:vercel",
  outputDirectory: ".next",
  git: { deploymentEnabled: { "*": false, main: false } },
};

/**
 * App subtrees omitted from the gova build.
 *
 * `src/app/api` goes as a whole and the routes gova keeps are copied back, so a
 * new business route is omitted by default. The alternative — listing what to
 * remove — makes every future route a silent addition to the gova artifact.
 *
 * `src/app/dev` and `src/app/api/dev` are development-only surfaces and must not
 * exist in a release artifact at all.
 */
export const GOVA_OMITTED_APP_TREES = ["src/app/api", "src/app/dev"] as const;

export const GOVA_OMITTED_FILES = [
  "next-env.d.ts",
  "src/features/advertisements/application/config/featured-marquee.seed.json",
  "src/features/advertisements/application/config/trending-ribbon.seed.json",
  "src/features/advertisements/application/config/home-hero-slider.seed.json",
  "src/features/home/presentation/home-trending-ribbon.json",
  "src/features/home/presentation/home-featured-marquee.json",
] as const;

export const GOVA_UPLOAD_MAX_BYTES = 16 * 1024 * 1024;
export const GOVA_UPLOAD_MAX_FILES = 2400;

const GOVA_BUILD_SCRIPT_FILES = [
  "scripts/check-vercel-function-size.ts",
  "scripts/release-readiness-barrier.ts",
  "scripts/vercel-build-artifact-guard.ts",
  "scripts/vercel-deployment-build.ts",
  "scripts/vercel-deployment-guards.ts",
  "scripts/verify-single-env-source.ts",
] as const;

const GOVA_UPLOAD_IGNORE_RULES = [
  "/.git/",
  "/.next/",
  "**/.next/",
  "node_modules/",
  ".env*",
  "/.tools/",
  "/.backups/",
  "/.agents/",
  "/.claude/",
  "/.secret-archive/",
  "/.bundle/",
  "/.devcontainer/",
  "/.vscode/",
  "/.githooks/",
  "/.github/",
  "/docs/",
  "/note/",
  "/test_profile/",
  "/fastlane/",
  "/assets/",
  "/config/",
  "/tools/",
  "/vendor/",
  "/android/",
  "/ios/",
  "/out/",
  "/tmp/",
  "/coverage/",
  "/services/",
  "/.local/",
  "/.vercel/",
  "/.deploy-all/",
  "/.agent-control/",
  "/.serena/",
  "**/__tests__/",
  "**/*.test.ts",
  "**/*.test.tsx",
  "**/*.spec.ts",
  "**/*.spec.tsx",
  "**/README.md",
  "packages/*/android/",
  "packages/*/ios/",
  "packages/*/scripts/",
  "packages/*/tsconfig.json",
  "packages/branding-core/assets/",
  "packages/branding-core/src/tooling/",
  "packages/branding-core/src/tooling.ts",
  "packages/branding-core/src/cli.ts",
  "packages/data-core/src/tooling/",
  "packages/data-core/src/**/migrations/",
  "/gova-deployment-manifest.json",
  "*.tsbuildinfo",
] as const;

const GOVA_VIEW_FILE_OVERRIDES: Record<string, string> = {
  // Next traces every import reachable from instrumentation, including imports
  // behind a runtime branch. The application instrumentation registers backend
  // ports and would therefore ship database drivers with every gova page. The
  // frontend has no server capability to register: its only handler is health
  // and its API boundary is the proxy, so this upload has an intentionally
  // empty instrumentation entrypoint.
  "src/instrumentation.ts": `export async function register(): Promise<void> {}
`,
  "src/app/s/product/page.tsx": `import { Suspense } from "react";

import { ProductPageContent } from "@/features/product/ui";

export default function ProductSharePage() {
  return (
    <Suspense fallback={null}>
      <ProductPageContent id="s.product.page.product-page-content" initialProduct={null} />
    </Suspense>
  );
}
`,
  "src/app/s/profile/page.tsx": `import { Suspense } from "react";

import { ProfilePageContent } from "@/features/profile/ui";

export default function ProfileSharePage() {
  return (
    <Suspense fallback={null}>
      <ProfilePageContent id="s.profile.page.profile-page-content" initialPublicProfile={null} />
    </Suspense>
  );
}
`,
};

/** What gova still answers itself. Everything else under `/api` is a redirect. */
export const GOVA_KEPT_API_ROUTES = ["health"] as const;

export interface GovaDeploymentManifest {
  omittedTrees: readonly string[];
  omittedFiles: readonly string[];
  keptApiRoutes: readonly string[];
  /** Repository-relative paths of every route module the view omits, sorted. */
  omittedRouteModules: readonly string[];
  /** Repository-relative paths of every route module the view keeps, sorted. */
  keptRouteModules: readonly string[];
}

function listRouteModules(
  root: string,
  current: string,
  out: string[],
): string[] {
  if (!existsSync(current)) return out;
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) listRouteModules(root, full, out);
    else if (entry.name === "route.ts" || entry.name === "route.tsx") {
      out.push(path.relative(root, full).split(path.sep).join("/"));
    }
  }
  return out;
}

/**
 * What the view would contain, computed from the repository alone.
 *
 * Separated from the copy so the drift check and the artifact gate can both ask
 * the question without writing anything.
 */
export function govaDeploymentManifest(root: string): GovaDeploymentManifest {
  const kept = new Set(
    GOVA_KEPT_API_ROUTES.flatMap((route) =>
      listRouteModules(root, path.join(root, "src/app/api", route), []),
    ),
  );
  const all = GOVA_OMITTED_APP_TREES.flatMap((tree) =>
    listRouteModules(root, path.join(root, tree), []),
  );
  return {
    omittedTrees: GOVA_OMITTED_APP_TREES,
    omittedFiles: GOVA_OMITTED_FILES,
    keptApiRoutes: GOVA_KEPT_API_ROUTES,
    omittedRouteModules: all.filter((file) => !kept.has(file)).sort(),
    keptRouteModules: [...kept].sort(),
  };
}

/**
 * Directories the view never copies.
 *
 * `services/` is the largest of them and the least obvious: gova's build never
 * reads another runtime's tree, and each service mirror is itself generated
 * output, so copying them would put a second, stale copy of every mirrored
 * module inside the view — where repository-wide scanners then find it.
 */
const COPY_IGNORED = new Set([
  "node_modules",
  ".git",
  ".next",
  "out",
  "android",
  "ios",
  "tmp",
  "services",
  ".local",
  ".vercel",
  ".deploy-all",
  ".agent-control",
  ".serena",
  ".tools",
  ".backups",
  ".agents",
  ".bundle",
  ".devcontainer",
  ".vscode",
  ".githooks",
  ".github",
  ".claude",
  ".secret-archive",
  ".ota",
  "docs",
  "note",
  "test_profile",
  "fastlane",
  "assets",
  "config",
  "tools",
  "vendor",
  "coverage",
  "apps",
  "README.md",
  "AGENTS.md",
  "CLAUDE.md",
  "GEMINI.md",
  "Gemfile",
  "Gemfile.lock",
  ".editorconfig",
  ".gitattributes",
  ".gitignore",
  ".mcp.json",
  "eslint.config.js",
  "capacitor.config.ts",
  "components.json",
  "drizzle.config.ts",
  "drizzle.product.config.ts",
  "drizzle.profile.config.ts",
  "tsconfig.tsbuildinfo",
  ".architecture-feature-verification-status",
  ".architecture-notification-reference-map",
  ".deploy-all-trigger",
  ".test-diagnostic-trigger",
  GOVA_DEPLOYMENT_DIR,
]);

function copyTree(source: string, destination: string, root = source): void {
  mkdirSync(destination, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const relative = path.relative(root, from).split(path.sep).join("/");
    if (
      !relative.includes("/") &&
      (COPY_IGNORED.has(entry.name) || entry.name.startsWith(".env"))
    )
      continue;
    if (relative === "services") continue;
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) copyTree(from, to, root);
    else cpSync(from, to);
  }
}

const LOCAL_CODE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

function walkFiles(root: string, current = root, out: string[] = []): string[] {
  if (!existsSync(current)) return out;
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) walkFiles(root, full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function codeEntrypoints(target: string): string[] {
  const seeds = walkFiles(target, path.join(target, "src", "app")).filter(
    (file) => LOCAL_CODE_EXTENSIONS.has(path.extname(file)),
  );
  const srcRoot = path.join(target, "src");
  for (const base of [
    "proxy",
    "middleware",
    "instrumentation",
    "instrumentation-client",
  ]) {
    for (const extension of LOCAL_CODE_EXTENSIONS) {
      const full = path.join(srcRoot, `${base}${extension}`);
      if (existsSync(full)) seeds.push(full);
    }
  }
  for (const relative of ["next.config.ts", ...GOVA_BUILD_SCRIPT_FILES]) {
    const full = path.join(target, relative);
    if (existsSync(full)) seeds.push(full);
  }
  return [...new Set(seeds.map((file) => path.resolve(file)))].sort();
}

function removeEmptyDirectories(current: string, keepRoot = true): void {
  if (!existsSync(current)) return;
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    if (entry.isDirectory())
      removeEmptyDirectories(path.join(current, entry.name), false);
  }
  if (!keepRoot && readdirSync(current).length === 0)
    rmSync(current, { recursive: true, force: true });
}

function removeNamedDirectories(current: string, name: string): void {
  if (!existsSync(current)) return;
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = path.join(current, entry.name);
    if (entry.name === name) rmSync(full, { recursive: true, force: true });
    else removeNamedDirectories(full, name);
  }
}

/**
 * Keep only code reachable from a real hosted-Gova entrypoint.
 *
 * TypeScript's own resolver is used rather than a regex scanner, so normal imports,
 * exports, dynamic string-literal imports, path aliases and type-only imports share
 * exactly the same module-resolution semantics as the hosted typecheck. `public/`
 * is deliberately outside this pruning pass: it is a runtime data contract and can
 * be addressed dynamically without appearing in the TypeScript graph.
 */
function pruneUnreachableHostedCode(target: string): number {
  const configPath = path.join(target, "tsconfig.json");
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error)
    throw new Error(`gova upload pruning could not read ${configPath}`);
  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    target,
    undefined,
    configPath,
  );
  const program = ts.createProgram({
    rootNames: codeEntrypoints(target),
    options: parsed.options,
  });
  const reachable = new Set(
    program
      .getSourceFiles()
      .map((source) => path.resolve(source.fileName))
      .filter(
        (file) => file === target || file.startsWith(`${target}${path.sep}`),
      ),
  );

  let removed = 0;
  for (const relativeRoot of ["src", "packages", "scripts"]) {
    const root = path.join(target, relativeRoot);
    for (const file of walkFiles(target, root)) {
      if (!LOCAL_CODE_EXTENSIONS.has(path.extname(file))) continue;
      if (reachable.has(path.resolve(file))) continue;
      rmSync(file, { force: true });
      removed += 1;
    }
  }

  const allowedScripts = new Set<string>(GOVA_BUILD_SCRIPT_FILES);
  const scriptsRoot = path.join(target, "scripts");
  for (const file of walkFiles(target, scriptsRoot)) {
    const relative = path.relative(target, file).split(path.sep).join("/");
    if (!allowedScripts.has(relative)) {
      rmSync(file, { force: true });
      removed += 1;
    }
  }

  const packagesRoot = path.join(target, "packages");
  if (existsSync(packagesRoot)) {
    for (const entry of readdirSync(packagesRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const packageRoot = path.join(packagesRoot, entry.name);
      const prefix = `${path.resolve(packageRoot)}${path.sep}`;
      if (![...reachable].some((file) => file.startsWith(prefix))) {
        rmSync(packageRoot, { recursive: true, force: true });
        continue;
      }
      for (const disposable of [
        "android",
        "ios",
        "scripts",
        "tests",
        "__tests__",
      ]) {
        rmSync(path.join(packageRoot, disposable), {
          recursive: true,
          force: true,
        });
        rmSync(path.join(packageRoot, "src", disposable), {
          recursive: true,
          force: true,
        });
      }
      for (const disposable of ["README.md", "tsconfig.json"]) {
        rmSync(path.join(packageRoot, disposable), { force: true });
      }
    }
  }

  rmSync(path.join(target, "packages", "branding-core", "assets"), {
    recursive: true,
    force: true,
  });
  removeNamedDirectories(
    path.join(target, "packages", "data-core"),
    "migrations",
  );
  removeEmptyDirectories(path.join(target, "src"));
  removeEmptyDirectories(path.join(target, "packages"));
  removeEmptyDirectories(path.join(target, "scripts"));
  return removed;
}

export interface GovaUploadTreeStats {
  fileCount: number;
  bytes: number;
}

export function measureGovaUploadTree(target: string): GovaUploadTreeStats {
  let fileCount = 0;
  let bytes = 0;
  for (const file of walkFiles(target)) {
    const relative = path.relative(target, file).split(path.sep).join("/");
    if (
      relative === "gova-deployment-manifest.json" ||
      relative.startsWith("node_modules/")
    )
      continue;
    fileCount += 1;
    bytes += statSync(file).size;
  }
  return { fileCount, bytes };
}

export function assertGovaUploadBudget(stats: GovaUploadTreeStats): void {
  if (
    stats.fileCount > GOVA_UPLOAD_MAX_FILES ||
    stats.bytes > GOVA_UPLOAD_MAX_BYTES
  ) {
    throw new Error(
      `gova minimal upload budget exceeded: ${stats.fileCount}/${GOVA_UPLOAD_MAX_FILES} files, ` +
        `${(stats.bytes / 1024 / 1024).toFixed(2)}/${(GOVA_UPLOAD_MAX_BYTES / 1024 / 1024).toFixed(2)} MiB. ` +
        "Re-prove the larger upload in the local Gova Vercel sandbox before raising this budget.",
    );
  }
}

function writeGovaUploadIgnore(target: string): void {
  writeFileSync(
    path.join(target, ".vercelignore"),
    `# Generated by @asol/gova-deployment-core. Defense-in-depth after the minimal-tree pruning pass.\n${GOVA_UPLOAD_IGNORE_RULES.join("\n")}\n`,
    "utf8",
  );
}

function linkWorkspacePackages(target: string): void {
  const packagesRoot = path.join(target, "packages");
  const scopeRoot = path.join(target, "node_modules", "@asol");
  if (!existsSync(packagesRoot)) return;
  mkdirSync(scopeRoot, { recursive: true });
  for (const entry of readdirSync(packagesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    symlinkSync(
      path.join("..", "..", "packages", entry.name),
      path.join(scopeRoot, entry.name),
      "dir",
    );
  }
}

/**
 * Writes the view and returns its manifest.
 *
 * Deterministic: the output depends only on the repository contents and the two
 * lists above, and the manifest carries no timestamp, so two runs on one commit
 * produce byte-identical trees and the drift check is a plain comparison.
 */
export function buildGovaDeploymentTree(root: string): GovaDeploymentManifest {
  const target = path.join(root, GOVA_DEPLOYMENT_DIR);
  rmSync(target, { recursive: true, force: true });
  copyTree(root, target);

  for (const tree of GOVA_OMITTED_APP_TREES) {
    rmSync(path.join(target, tree), { recursive: true, force: true });
  }
  for (const file of GOVA_OMITTED_FILES) {
    rmSync(path.join(target, file), { force: true });
  }
  for (const route of GOVA_KEPT_API_ROUTES) {
    const source = path.join(root, "src/app/api", route);
    if (!existsSync(source))
      throw new Error(`gova keeps ${route} but it does not exist`);
    const destination = path.join(target, "src/app/api", route);
    mkdirSync(path.dirname(destination), { recursive: true });
    cpSync(source, destination, { recursive: true });
  }
  for (const [file, content] of Object.entries(GOVA_VIEW_FILE_OVERRIDES)) {
    const destination = path.join(target, file);
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, content, "utf8");
  }

  // Resolve workspace package exports from inside the upload tree itself while
  // computing reachability. Without these temporary links TypeScript can walk up
  // to the repository's parent node_modules and mark the original checkout as
  // reachable instead of the isolated deployment view.
  linkWorkspacePackages(target);
  const prunedCodeFiles = pruneUnreachableHostedCode(target);
  rmSync(path.join(target, "node_modules"), { recursive: true, force: true });

  // Vercel uploads this view directly. Its output lives at the view root rather
  // than in a second nested copy of `.tmp-gova-build`.
  writeFileSync(
    path.join(target, "vercel.json"),
    `${JSON.stringify(GOVA_UPLOAD_VERCEL_CONFIG, null, 2)}\n`,
    "utf8",
  );
  writeGovaUploadIgnore(target);
  linkWorkspacePackages(target);

  const uploadStats = measureGovaUploadTree(target);
  assertGovaUploadBudget(uploadStats);
  console.log(
    `[gova-deployment] minimal upload tree: ${uploadStats.fileCount} files, ` +
      `${(uploadStats.bytes / 1024 / 1024).toFixed(2)} MiB; ${prunedCodeFiles} unreachable code files pruned.`,
  );

  const manifest = govaDeploymentManifest(root);
  writeFileSync(
    path.join(target, "gova-deployment-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  return manifest;
}
