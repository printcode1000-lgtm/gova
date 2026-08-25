import type { KnowledgeGraph } from '../docs/model';
import { pathExists, readRepoText, walkFiles } from '../docs/fs-scan';
import { CORE_RUNTIME_IDS } from '../docs/runtime-knowledge';

export type RuntimeSurface = 'static' | 'dev' | 'web' | 'android' | 'ios';

function assertTrue(condition: boolean, message: string, errors: string[]): void {
  if (!condition) errors.push(message);
}

export function checkStaticRuntimeCompatibility(): string[] {
  const errors: string[] = [];
  if (!pathExists('capacitor.config.ts')) {
    errors.push('missing capacitor.config.ts for static/native webDir contract');
  } else {
    const content = readRepoText('capacitor.config.ts');
    assertTrue(/webDir:\s*['"]out['"]/.test(content), 'capacitor webDir must be out for static/native production payload', errors);
  }

  // Explicit client modules must not import server-only Next/Node APIs.
  const clientModules = walkFiles('src', (path) => /\.(ts|tsx)$/.test(path));
  for (const path of clientModules) {
    const content = readRepoText(path);
    if (!/^['"]use client['"]/m.test(content)) continue;
    if (content.includes('next/headers') || content.includes('next/server')) {
      errors.push(`static/client-unsafe server import in client module ${path}`);
    }
    if (/from\s+['"]fs['"]|from\s+['"]node:fs['"]/.test(content)) {
      errors.push(`static/client-unsafe node:fs import in client module ${path}`);
    }
  }

  // Document that API handlers exist for web but must not be assumed in out/.
  const handlers = walkFiles('src/app', (path) => /\/route\.[cm]?[jt]sx?$/.test(path));
  if (!handlers.length) errors.push('no App Router handlers found; static/remote API boundary assumptions cannot be validated');
  return [...new Set(errors)].sort();
}

export function checkDevRuntimeCompatibility(): string[] {
  const errors: string[] = [];
  const manifest = JSON.parse(readRepoText('package.json')) as { scripts?: Record<string, string> };
  assertTrue(Boolean(manifest.scripts?.dev?.includes('3001')), 'dev script must target port 3001', errors);
  // Dev-only surfaces should remain under recognizable roots.
  for (const path of walkFiles('src/app', (file) => file.endsWith('/page.tsx') || file.endsWith('/page.ts'))) {
    if (path.includes('/dev/') || path.startsWith('src/app/dev/')) continue;
    const content = readRepoText(path);
    if (/DEV_ONLY_RELEASE_LEAK|forceExportDevOnly/i.test(content)) {
      errors.push(`suspicious dev-only leak marker in non-dev page: ${path}`);
    }
  }
  return [...new Set(errors)].sort();
}

export function checkWebRuntimeCompatibility(): string[] {
  const errors: string[] = [];
  const handlers = walkFiles('src/app', (path) => /\/route\.[cm]?[jt]sx?$/.test(path));
  assertTrue(handlers.length > 0, 'web runtime expects App Router handlers under src/app', errors);
  if (pathExists('next.config.ts')) {
    const content = readRepoText('next.config.ts');
    // Static export mode may be toggled by env; ensure file exists and is readable.
    assertTrue(content.length > 0, 'next.config.ts is empty', errors);
  } else {
    errors.push('missing next.config.ts');
  }
  return [...new Set(errors)].sort();
}

export function checkAndroidRuntimeCompatibility(): string[] {
  const errors: string[] = [];
  assertTrue(pathExists('android/app/src/main/AndroidManifest.xml'), 'missing AndroidManifest.xml', errors);
  assertTrue(pathExists('android/app/build.gradle') || pathExists('android/app/build.gradle.kts'), 'missing android app build.gradle', errors);
  if (pathExists('capacitor.config.ts')) {
    const content = readRepoText('capacitor.config.ts');
    assertTrue(/webDir:\s*['"]out['"]/.test(content), 'Android production must consume out/ via Capacitor webDir', errors);
  }
  return [...new Set(errors)].sort();
}

export function checkIosRuntimeCompatibility(): string[] {
  const errors: string[] = [];
  assertTrue(pathExists('ios/App/App/Info.plist'), 'missing iOS Info.plist', errors);
  assertTrue(pathExists('ios/App/App/App.entitlements'), 'missing iOS entitlements', errors);
  if (pathExists('capacitor.config.ts')) {
    const content = readRepoText('capacitor.config.ts');
    assertTrue(/webDir:\s*['"]out['"]/.test(content), 'iOS production must consume out/ via Capacitor webDir', errors);
  }
  return [...new Set(errors)].sort();
}

export function checkRuntimeSurface(surface: RuntimeSurface): string[] {
  switch (surface) {
    case 'static':
      return checkStaticRuntimeCompatibility();
    case 'dev':
      return checkDevRuntimeCompatibility();
    case 'web':
      return checkWebRuntimeCompatibility();
    case 'android':
      return checkAndroidRuntimeCompatibility();
    case 'ios':
      return checkIosRuntimeCompatibility();
    default:
      return [`unknown runtime surface: ${String(surface)}`];
  }
}

export function checkAllRuntimeCompatibility(): string[] {
  return [
    ...checkRuntimeSurface('dev'),
    ...checkRuntimeSurface('web'),
    ...checkRuntimeSurface('static'),
    ...checkRuntimeSurface('android'),
    ...checkRuntimeSurface('ios'),
  ];
}

export function renderRuntimeCompatibilityMatrix(graph: KnowledgeGraph): string {
  const banner = `<!-- GENERATED FILE. DO NOT EDIT BY HAND.
     Source: live repository graph built by scripts/docs/.
     Regenerate: npm run docs:generate
     Validate: npm run docs:ci -->
`;
  const surfaces: Array<{ id: string; name: string; errors: string[] }> = [
    { id: 'development', name: 'Development', errors: checkDevRuntimeCompatibility() },
    { id: 'web', name: 'Web', errors: checkWebRuntimeCompatibility() },
    { id: 'static-out', name: 'Static out', errors: checkStaticRuntimeCompatibility() },
    { id: 'android', name: 'Android', errors: checkAndroidRuntimeCompatibility() },
    { id: 'ios', name: 'iOS', errors: checkIosRuntimeCompatibility() },
  ];
  const lines = [
    banner,
    '# Runtime Compatibility Matrix',
    '',
    'Safe non-publishing checks only. This report does not deploy, publish OTA, upload store artifacts, or mutate release `out/`.',
    '',
    '| Surface | Graph node | Check status | Error count |',
    '|---|---|---|---:|',
  ];
  for (const surface of surfaces) {
    const nodePresent = graph.nodes.some((node) => node.id === `runtime:${surface.id}` || (surface.id === 'development' && node.id === 'runtime:development'));
    // CORE ids use development/web/static-out/android/ios
    const mappedId = surface.id === 'development' ? 'development' : surface.id;
    const present = CORE_RUNTIME_IDS.includes(mappedId as (typeof CORE_RUNTIME_IDS)[number]) || nodePresent;
    lines.push(
      `| ${surface.name} | ${present ? 'present' : 'MISSING'} | ${surface.errors.length ? 'FAIL' : 'pass'} | ${surface.errors.length} |`,
    );
  }
  lines.push('', '## Failures', '');
  const failures = surfaces.flatMap((surface) => surface.errors.map((error) => `- **${surface.name}:** ${error}`));
  if (!failures.length) lines.push('- none');
  else lines.push(...failures);
  lines.push('');
  return lines.join('\n');
}
