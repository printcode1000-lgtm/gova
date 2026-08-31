import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
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

/** What gova still answers itself. Everything else under `/api` is a redirect. */
export const GOVA_KEPT_API_ROUTES = ['health'] as const;

export interface GovaDeploymentManifest {
  omittedTrees: readonly string[];
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

function copyTree(source: string, destination: string): void {
  mkdirSync(destination, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    if (COPY_IGNORED.has(entry.name)) continue;
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else cpSync(from, to);
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
  for (const route of GOVA_KEPT_API_ROUTES) {
    const source = path.join(root, 'src/app/api', route);
    if (!existsSync(source)) throw new Error(`gova keeps ${route} but it does not exist`);
    const destination = path.join(target, 'src/app/api', route);
    mkdirSync(path.dirname(destination), { recursive: true });
    cpSync(source, destination, { recursive: true });
  }

  const manifest = govaDeploymentManifest(root);
  writeFileSync(
    path.join(target, 'gova-deployment-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
  return manifest;
}
