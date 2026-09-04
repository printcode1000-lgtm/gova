import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

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
export const GOVA_DEPLOYMENT_DIR = '.tmp-gova-build';

/** The upload view is itself the Vercel project root, never the full checkout. */
const GOVA_UPLOAD_VERCEL_CONFIG = {
  $schema: 'https://openapi.vercel.sh/vercel.json',
  installCommand: 'npm ci',
  buildCommand: 'npm run build:vercel',
  outputDirectory: '.next',
  git: { deploymentEnabled: { '*': false, main: false } },
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
export const GOVA_OMITTED_APP_TREES = [
  'src/app/api',
  'src/app/dev',
] as const;

export const GOVA_OMITTED_FILES = [] as const;

const GOVA_VIEW_FILE_OVERRIDES: Record<string, string> = {
  'src/app/s/product/page.tsx': `import { Suspense } from "react";

import { ProductPageContent } from "@/features/product/ui";

export default function ProductSharePage() {
  return (
    <Suspense fallback={null}>
      <ProductPageContent id="s.product.page.product-page-content" initialProduct={null} />
    </Suspense>
  );
}
`,
  'src/app/s/profile/page.tsx': `import { Suspense } from "react";

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
export const GOVA_KEPT_API_ROUTES = ['health'] as const;

export interface GovaDeploymentManifest {
  omittedTrees: readonly string[];
  omittedFiles: readonly string[];
  keptApiRoutes: readonly string[];
  /** Repository-relative paths of every route module the view omits, sorted. */
  omittedRouteModules: readonly string[];
  /** Repository-relative paths of every route module the view keeps, sorted. */
  keptRouteModules: readonly string[];
}

function listRouteModules(root: string, current: string, out: string[]): string[] {
  if (!existsSync(current)) return out;
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) listRouteModules(root, full, out);
    else if (entry.name === 'route.ts' || entry.name === 'route.tsx') {
      out.push(path.relative(root, full).split(path.sep).join('/'));
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
      listRouteModules(root, path.join(root, 'src/app/api', route), []),
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
  'node_modules',
  '.git',
  '.next',
  'out',
  'android',
  'ios',
  'tmp',
  'services',
  '.local',
  '.vercel',
  GOVA_DEPLOYMENT_DIR,
]);

function copyTree(source: string, destination: string, root = source): void {
  mkdirSync(destination, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const relative = path.relative(root, from).split(path.sep).join('/');
    if (COPY_IGNORED.has(entry.name) && !relative.includes('/')) continue;
    if (relative === 'services') continue;
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) copyTree(from, to, root);
    else cpSync(from, to);
  }
}

function linkWorkspacePackages(target: string): void {
  const packagesRoot = path.join(target, 'packages');
  const scopeRoot = path.join(target, 'node_modules', '@asol');
  if (!existsSync(packagesRoot)) return;
  mkdirSync(scopeRoot, { recursive: true });
  for (const entry of readdirSync(packagesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    symlinkSync(path.join('..', '..', 'packages', entry.name), path.join(scopeRoot, entry.name), 'dir');
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
    const source = path.join(root, 'src/app/api', route);
    if (!existsSync(source)) throw new Error(`gova keeps ${route} but it does not exist`);
    const destination = path.join(target, 'src/app/api', route);
    mkdirSync(path.dirname(destination), { recursive: true });
    cpSync(source, destination, { recursive: true });
  }
  for (const [file, content] of Object.entries(GOVA_VIEW_FILE_OVERRIDES)) {
    const destination = path.join(target, file);
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, content, 'utf8');
  }
  // Vercel uploads this view directly. Its output lives at the view root rather
  // than in a second nested copy of `.tmp-gova-build`.
  writeFileSync(
    path.join(target, 'vercel.json'),
    `${JSON.stringify(GOVA_UPLOAD_VERCEL_CONFIG, null, 2)}\n`,
    'utf8',
  );
  linkWorkspacePackages(target);

  const manifest = govaDeploymentManifest(root);
  writeFileSync(
    path.join(target, 'gova-deployment-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
  return manifest;
}
