import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { assertGovaArtifact } from '../artifact-gate';
import {
  GOVA_DEPLOYMENT_DIR,
  GOVA_KEPT_API_ROUTES,
  buildGovaDeploymentTree,
  govaDeploymentManifest,
} from '../tree';

function write(file: string, content = 'export function GET() {}\n'): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content, 'utf8');
}

function fixtureRepository(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'gova-deployment-'));
  write(path.join(root, 'src/app/api/health/route.ts'));
  write(path.join(root, 'src/app/api/super-admin/build-jobs/route.ts'));
  write(path.join(root, 'src/app/api/products/route.ts'));
  write(path.join(root, 'src/app/api/dev/catalog-studio/route.ts'));
  write(path.join(root, 'src/app/page.tsx'), 'export default function Page() { return null; }\n');
  write(path.join(root, 'packages/gova-deployment-core/package.json'), '{"name":"@asol/gova-deployment-core","exports":{".":"./src/index.ts"}}\n');
  write(path.join(root, 'packages/gova-deployment-core/src/index.ts'), 'export {}\n');
  write(path.join(root, 'public/logo.png'), 'png');
  write(path.join(root, 'package.json'), '{}\n');
  return root;
}

// ── The view keeps the frontend and drops every business route ───────────────
{
  const root = fixtureRepository();
  const manifest = buildGovaDeploymentTree(root);
  const view = path.join(root, GOVA_DEPLOYMENT_DIR);
  write(path.join(root, 'src/proxy.ts'));
  buildGovaDeploymentTree(root);

  assert.ok(existsSync(path.join(view, 'src/app/api/health/route.ts')), 'health must survive');
  assert.ok(existsSync(path.join(view, 'src/app/page.tsx')), 'pages must survive');
  assert.ok(existsSync(path.join(view, 'public/logo.png')), 'static assets must survive');
  assert.ok(existsSync(path.join(view, 'src/proxy.ts')), 'gova compatibility proxy must survive');
  assert.ok(existsSync(path.join(view, 'node_modules/@asol/gova-deployment-core')), 'workspace packages resolve inside the view');
  const uploadConfig = JSON.parse(readFileSync(path.join(view, 'vercel.json'), 'utf8')) as {
    outputDirectory?: string;
    git?: { deploymentEnabled?: Record<string, boolean> };
  };
  assert.equal(uploadConfig.outputDirectory, '.next', 'the upload view must not nest a second build tree');
  assert.deepEqual(uploadConfig.git?.deploymentEnabled, { '*': false, main: false });

  for (const omitted of [
    'src/app/api/super-admin/build-jobs/route.ts',
    'src/app/api/products/route.ts',
    'src/app/api/dev/catalog-studio/route.ts',
  ]) {
    assert.ok(!existsSync(path.join(view, omitted)), `${omitted} must be omitted`);
  }

  assert.deepEqual(manifest.keptRouteModules, ['src/app/api/health/route.ts']);
  assert.deepEqual(manifest.omittedRouteModules, [
    'src/app/api/dev/catalog-studio/route.ts',
    'src/app/api/products/route.ts',
    'src/app/api/super-admin/build-jobs/route.ts',
  ]);
  rmSync(root, { recursive: true, force: true });
}

// ── A new business route is omitted by default, not added to gova ────────────
{
  const root = fixtureRepository();
  write(path.join(root, 'src/app/api/brand-new-capability/route.ts'));
  const manifest = govaDeploymentManifest(root);
  assert.ok(
    manifest.omittedRouteModules.includes('src/app/api/brand-new-capability/route.ts'),
    'the view removes src/app/api wholesale and copies back only what gova keeps, so a route ' +
      'nobody remembered to classify stays out of the artifact',
  );
  rmSync(root, { recursive: true, force: true });
}

// ── The view is deterministic, so drift is a plain comparison ────────────────
{
  const root = fixtureRepository();
  const first = buildGovaDeploymentTree(root);
  const second = buildGovaDeploymentTree(root);
  assert.deepEqual(first, second);
  rmSync(root, { recursive: true, force: true });
}

// ── The artifact gate reads what was built, not what was intended ────────────
function artifactRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'gova-artifact-'));
  write(path.join(root, '.next/server/app/api/health/route.js'), '// health\n');
  write(path.join(root, '.next/server/app/page.js.nft.json'), '{"files":["../chunk.js"]}\n');
  return root;
}

{
  const root = artifactRoot();
  const report = assertGovaArtifact(root);
  assert.deepEqual(report.apiFunctions, ['health']);
  assert.deepEqual(GOVA_KEPT_API_ROUTES, ['health']);
  rmSync(root, { recursive: true, force: true });
}

{
  const root = artifactRoot();
  write(path.join(root, '.next/server/app/api/super-admin/build-jobs/route.js'), '// business\n');
  assert.throws(() => assertGovaArtifact(root), /Business API functions in the gova artifact/);
  rmSync(root, { recursive: true, force: true });
}

{
  const root = artifactRoot();
  write(path.join(root, '.next/server/app/api/dev/catalog-studio/route.js'), '// dev\n');
  assert.throws(() => assertGovaArtifact(root), /Development API in a release artifact/);
  rmSync(root, { recursive: true, force: true });
}

{
  const root = artifactRoot();
  write(path.join(root, '.next/server/app/page.js.nft.json'), '{"files":["../../node_modules/better-sqlite3/index.js"]}\n');
  assert.throws(() => assertGovaArtifact(root), /Business capability in the gova server trace/);
  rmSync(root, { recursive: true, force: true });
}

{
  const root = artifactRoot();
  write(path.join(root, '.next/server/app/page.js.nft.json'), '{"files":["../x.js"],"env":["TURSO_AUTH_TOKEN"]}\n');
  assert.throws(() => assertGovaArtifact(root), /secrets it must not hold/);
  rmSync(root, { recursive: true, force: true });
}

{
  const root = mkdtempSync(path.join(tmpdir(), 'gova-artifact-empty-'));
  assert.throws(() => assertGovaArtifact(root), /build gova first/);
  rmSync(root, { recursive: true, force: true });
}

console.log('@asol/gova-deployment-core: build view omits business API, gate reads the artifact.');
