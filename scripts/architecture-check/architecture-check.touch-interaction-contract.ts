import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { ROOT, addViolation } from './architecture-check.architecture-types';

/**
 * ASOL runs only on touch screens, so hover can never fire and a pointer cursor
 * can never be shown. The rule is enforced here rather than left to review
 * because a single copied Tailwind snippet reintroduces it silently — the
 * styling still compiles and still looks right in a desktop browser.
 *
 * `active:` and `focus-visible:` are deliberately NOT flagged: the first is the
 * only honest touch feedback, the second never fires on touch but keeps keyboard
 * and accessibility navigation usable.
 *
 * Policy: docs/04-ui-components/touch-interaction-policy.md
 */
const SCANNED_ROOTS = ['src', 'packages'] as const;
const SCANNED_EXTENSIONS = /\.(ts|tsx|css)$/;
const POLICY_DOC = 'See docs/04-ui-components/touch-interaction-policy.md';

interface ForbiddenPattern {
  readonly pattern: RegExp;
  readonly message: string;
}

const FORBIDDEN_PATTERNS: readonly ForbiddenPattern[] = [
  {
    pattern: /(?:^|[\s"'`])(?:[a-z0-9-]+:)*(?:group-|peer-)?hover:/,
    message:
      'Tailwind hover variant. There is no pointer on a touch device — use `active:` for press feedback.',
  },
  {
    pattern: /:hover\b/,
    message:
      'CSS :hover selector. There is no pointer on a touch device — use `:active` for press feedback.',
  },
  {
    pattern: /\bcursor-pointer\b|cursor:\s*pointer/,
    message: 'Pointer cursor. A touch screen has no cursor to style.',
  },
];

/**
 * A `title` attribute on a DOM element renders the browser's own hover tooltip —
 * a desktop affordance a touch user can never trigger, so the text it carries is
 * simply lost. `aria-label` delivers the same string to assistive technology
 * without painting a tooltip. A prop named `title` on a React component
 * (`<Card title={...}>`) is ordinary data and is left alone, which is why the
 * check keys on the case of the nearest opening tag.
 */
function reportDomTitleAttributes(rel: string, content: string): void {
  const openingTag = /<([A-Za-z][\w.]*)/g;

  for (const match of content.matchAll(/\btitle=/g)) {
    const preceding = [...content.slice(0, match.index).matchAll(openingTag)].pop();
    if (!preceding) continue;

    const tagName = preceding[1];
    const isDomElement = tagName[0] === tagName[0].toLowerCase();
    if (!isDomElement || tagName === 'title' || tagName === 'head') continue;

    const line = content.slice(0, match.index).split('\n').length;
    addViolation(
      'shared',
      `${rel}:${line}`,
      'title attribute on <' +
        tagName +
        '> renders a hover-only browser tooltip. Use aria-label instead. ' +
        POLICY_DOC,
    );
  }
}

function collectFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.next') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...collectFiles(full));
    else if (SCANNED_EXTENSIONS.test(entry)) files.push(full);
  }
  return files;
}

export function checkTouchInteractionContract(): void {
  for (const root of SCANNED_ROOTS) {
    const dir = join(ROOT, root);
    if (!existsSync(dir)) continue;

    for (const file of collectFiles(dir)) {
      const rel = relative(ROOT, file).replace(/\\/g, '/');
      const content = readFileSync(file, 'utf8');

      if (file.endsWith('.tsx')) reportDomTitleAttributes(rel, content);

      for (const [index, line] of content.split('\n').entries()) {
        for (const { pattern, message } of FORBIDDEN_PATTERNS) {
          if (!pattern.test(line)) continue;
          addViolation('shared', `${rel}:${index + 1}`, `${message} ${POLICY_DOC}`);
        }
      }
    }
  }
}
