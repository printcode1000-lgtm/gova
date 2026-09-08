import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT, addViolation, walk } from './architecture-types';

const GLOBALS_RELATIVE_PATH = 'src/app/globals.css';
const GLOBALS_PATH = join(ROOT, GLOBALS_RELATIVE_PATH);
const POLICY_DOC = 'See docs/04-ui-components/theme-system.md#app-header-content-spacing';

function report(file: string, message: string): void {
  addViolation('shared', file, `${message} ${POLICY_DOC}`);
}

export function checkAppShellSpacingContract(): void {
  if (!existsSync(GLOBALS_PATH)) {
    report(GLOBALS_RELATIVE_PATH, 'App shell spacing source is missing.');
    return;
  }

  const css = readFileSync(GLOBALS_PATH, 'utf8');
  if (!/--asol-shell-main-gap:\s*3px\s*;/.test(css)) {
    report(GLOBALS_RELATIVE_PATH, 'AppHeader-to-page gap must be exactly 3px on every screen size.');
  }

  const firstChildRule = css.match(/\.asol-shell-main\s*>\s*:first-child\s*\{([\s\S]*?)\}/)?.[1] ?? '';
  if (!/margin-top:\s*0\s*!important\s*;/.test(firstChildRule)) {
    report(GLOBALS_RELATIVE_PATH, 'First page surface must force margin-top to 0.');
  }
  if (!/padding-top:\s*0\s*!important\s*;/.test(firstChildRule)) {
    report(GLOBALS_RELATIVE_PATH, 'First page surface must force padding-top to 0.');
  }

  const firstElementRule =
    css.match(/\.asol-shell-main\s*>\s*:first-child\s*>\s*:first-child\s*\{([\s\S]*?)\}/)?.[1] ?? '';
  if (!/margin-top:\s*0\s*!important\s*;/.test(firstElementRule)) {
    report(
      GLOBALS_RELATIVE_PATH,
      'First element inside every page surface must match Home with margin-top 0.',
    );
  }

  for (const file of walk(join(ROOT, 'src'))) {
    if (!/\.(ts|tsx|css)$/.test(file) || file === GLOBALS_PATH) continue;
    const content = readFileSync(file, 'utf8');
    const relative = file.slice(ROOT.length + 1).replace(/\\/g, '/');
    if (content.includes('--asol-shell-main-gap')) {
      report(relative, 'Per-page shell-gap overrides are forbidden; AppShell owns the value globally.');
    }
    if (file.endsWith('.css') && content.includes('.asol-shell-main')) {
      report(relative, 'AppShell spacing CSS may exist only in src/app/globals.css.');
    }
  }
}
