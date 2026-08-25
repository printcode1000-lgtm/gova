import {
  checkAllRuntimeCompatibility,
  checkRuntimeSurface,
  type RuntimeSurface,
} from './compatibility-checks';
import { listChangedPathsAgainst } from '../docs/document-mutability';

function run(surface?: RuntimeSurface | 'all' | 'changed'): string[] {
  if (!surface || surface === 'all') return checkAllRuntimeCompatibility();
  if (surface === 'changed') {
    const changed = listChangedPathsAgainst(process.env.DOCS_CI_BASE_REF);
    const surfaces = new Set<RuntimeSurface>();
    if (!changed.length) return checkAllRuntimeCompatibility();
    for (const path of changed) {
      if (path.startsWith('android/') || path.includes('capacitor')) surfaces.add('android');
      if (path.startsWith('ios/') || path.includes('capacitor')) surfaces.add('ios');
      if (path.startsWith('src/app/api/') || path.includes('/route.')) surfaces.add('web');
      if (path.startsWith('src/') || path.startsWith('packages/')) {
        surfaces.add('static');
        surfaces.add('dev');
        surfaces.add('web');
      }
      if (path.startsWith('src/app/dev/') || path.includes('/dev-')) surfaces.add('dev');
    }
    if (!surfaces.size) return checkAllRuntimeCompatibility();
    return [...surfaces].flatMap((item) => checkRuntimeSurface(item));
  }
  return checkRuntimeSurface(surface);
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/scripts/runtime/check.ts')) {
  const arg = (process.argv[2] || 'all') as RuntimeSurface | 'all' | 'changed';
  const errors = run(arg);
  if (errors.length) {
    console.error(`Runtime compatibility check failed (${arg}):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(`Runtime compatibility check passed (${arg}).`);
  }
}
