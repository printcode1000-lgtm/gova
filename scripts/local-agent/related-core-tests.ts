import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Resolves which `test:*-core` npm scripts a commit range actually touches.
 *
 * The cloud Mode-B projection re-runs verification on this machine before the
 * Gateway is allowed to change `/home/hesham/gova`. Running all 36 core suites
 * for a two-file commit would make that gate slow enough to be bypassed, and
 * running none of them would make it meaningless. So the mapping is deliberately
 * literal — a package directory, a feature directory, a service directory, or an
 * API route names its own suite — and anything that only touches shared tooling,
 * documentation, or repository policy falls back to the architecture suite,
 * which is the floor rather than an empty result.
 */

const ROOT = process.cwd();
const ARCHITECTURE_FLOOR = 'test:architecture-core';

function coreScriptNames(): Set<string> {
  const manifest = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as { scripts?: Record<string, string> };
  return new Set(Object.keys(manifest.scripts ?? {}).filter((name) => name.startsWith('test:') && name.endsWith('-core')));
}

export function changedPathsInRange(base: string, head: string): string[] {
  const output = execFileSync('git', ['diff', '--name-only', `${base}..${head}`], { cwd: ROOT, encoding: 'utf8' });
  return output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export function relatedCoreTests(paths: readonly string[], available: ReadonlySet<string>): string[] {
  const suites = new Set<string>();
  for (const changed of paths) {
    const segments = changed.split('/');
    if (segments[0] === 'packages' && segments.length > 1) add(suites, available, `test:${segments[1]}`);
    if (segments[0] === 'services' && segments.length > 1) add(suites, available, `test:${segments[1]}-core`);
    if (segments[0] === 'src' && segments[1] === 'features' && segments.length > 2) add(suites, available, `test:${segments[2]}-core`);
    if (changed.startsWith('src/app/api/') || /\/route\.[cm]?[jt]sx?$/.test(changed)) add(suites, available, 'test:api-core');
    if (changed.startsWith('android/') || changed.startsWith('ios/')) add(suites, available, 'test:native-core');
    if (changed.startsWith('scripts/') || changed.startsWith('tools/local-agent/') || changed.startsWith('.github/') || changed.startsWith('docs/')) {
      add(suites, available, ARCHITECTURE_FLOOR);
    }
  }
  if (suites.size === 0) add(suites, available, ARCHITECTURE_FLOOR);
  return [...suites].sort();
}

function add(suites: Set<string>, available: ReadonlySet<string>, name: string): void {
  if (available.has(name)) suites.add(name);
}

const executedDirectly = process.argv[1]?.replace(/\\/g, '/').endsWith('/scripts/local-agent/related-core-tests.ts');
if (executedDirectly) {
  const [base, head] = process.argv.slice(2);
  if (!base || !head) {
    console.error('Usage: npx tsx scripts/local-agent/related-core-tests.ts <base-ref> <head-ref>');
    process.exitCode = 1;
  } else if (!existsSync(path.join(ROOT, 'package.json'))) {
    console.error('related-core-tests must run from a repository checkout root.');
    process.exitCode = 1;
  } else {
    for (const suite of relatedCoreTests(changedPathsInRange(base, head), coreScriptNames())) console.log(suite);
  }
}
