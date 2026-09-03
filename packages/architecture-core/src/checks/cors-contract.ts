import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import { ROOT, addViolation, rel } from './architecture-types';

/**
 * One package owns every CORS header in this repository.
 *
 * Before `@asol/cors` existed, the same record of allow-origin / allow-methods / allow-headers /
 * max-age strings was written out by hand in nine places: five service HTTP helpers, two proxies,
 * the control route seam, two notification send endpoints, and the Next.js header table. They
 * drifted, and two of the drifts became production outages — a mirror answering a narrower
 * request-header list than the client sends (reported to users as an unreachable server), and a
 * runtime answering every preflight with a bare `204` and no origin header at all (the entire
 * Super Admin console, unreachable from a browser while every server-side probe passed).
 *
 * Consolidating them fixes nothing on its own: a single copied route file brings the tenth copy
 * back, and it will look correct. So the rule is enforced here. Header *names* may be written only
 * inside `@asol/cors`; everywhere else a surface states a `CorsPolicy` and asks the package for the
 * headers.
 *
 * Policy: docs/05-platform-features/sealed-packages/cors-module.md
 */
const OWNER = 'packages/cors/';

/**
 * Comment lines are not construction.
 *
 * Every proxy in the repository explains *why* it exists by naming the header whose absence caused
 * the outage, and that prose is the most useful thing in the file. The scan looks for code, so a
 * line that is entirely a comment is skipped — a header set on a line that also carries a comment
 * is still code, and still reported.
 */
function isCommentLine(line: string): boolean {
  const code = line.trim();
  return code.startsWith('*') || code.startsWith('//') || code.startsWith('/*');
}

/**
 * A test may name a header, because asserting the wire format is the only way to test it: the
 * checks in `packages/cors/src/tests/`, `scripts/tests/service-cors-boundary.test.ts` and the gova
 * compatibility boundary test all read the headers a response actually carries. A test cannot
 * serve traffic, so a copy hidden in one changes no deployment's behaviour.
 */
function isTestFile(fileRel: string): boolean {
  return fileRel.includes('/tests/') || /\.test\.tsx?$/.test(fileRel);
}

const HEADER_PATTERN = /Access-Control-[A-Za-z-]*/i;

const SOURCE_EXTENSIONS = /\.(ts|tsx|js|mjs|cjs)$/;

/**
 * Roots that ship code.
 *
 * `node_modules` is skipped at the directory, not filtered afterwards: a vendored type definition
 * that lists every header name is not this repository's code, and walking into it to reject it is
 * the slowest part of the scan. `services/*​/generated/` is skipped for the same reason it is
 * skipped everywhere else — it is a mirror of sources already scanned here, and a violation there
 * can only be fixed by regenerating it.
 */
function collectSources(directory: string, files: string[]): void {
  for (const entry of readdirSync(directory)) {
    if (entry === 'node_modules' || entry === 'generated' || entry === '.next') continue;
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) collectSources(full, files);
    else if (SOURCE_EXTENSIONS.test(entry)) files.push(full);
  }
}

function scannedFiles(): string[] {
  const files: string[] = [];
  for (const root of ['src', 'packages', 'scripts', 'services']) {
    const absolute = join(ROOT, root);
    if (existsSync(absolute)) collectSources(absolute, files);
  }
  for (const rootFile of ['next.config.ts', 'capacitor.config.ts']) {
    const absolute = join(ROOT, rootFile);
    if (existsSync(absolute)) files.push(absolute);
  }
  return files;
}

export function checkCorsContract(): void {
  let ownerFound = false;

  for (const file of scannedFiles()) {
    const fileRel = rel(file);
    // This file states the pattern it looks for.
    if (fileRel === 'packages/architecture-core/src/checks/cors-contract.ts') continue;

    if (fileRel.startsWith(OWNER)) {
      ownerFound = true;
      continue;
    }
    if (isTestFile(fileRel)) continue;

    const content = readFileSync(file, 'utf8');
    if (!HEADER_PATTERN.test(content)) continue;

    const lines = content.split('\n');
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]!;
      if (isCommentLine(line)) continue;
      const match = HEADER_PATTERN.exec(line);
      if (!match) continue;

      addViolation(
        'CORS Single Source',
        file,
        `${fileRel}:${index + 1} writes the CORS header "${match[0]}" by hand.`,
        'Only @asol/cors may name an Access-Control-* header. State a policy with `createCorsPolicy` and ' +
          'ask for the headers with `resolveCorsHeaders` / `handleCorsPreflight` / `withCorsHeaders`. ' +
          'See docs/05-platform-features/sealed-packages/cors-module.md.',
      );
    }
  }

  // Not `if (!exists) return`: a guard that silently stops guarding after the package moves reports
  // green while asserting nothing. The five copies came back once already.
  if (!ownerFound) {
    throw new Error(
      `The CORS owner ${OWNER} was not found. A single-source rule with no source to point at ` +
        'enforces nothing — fix the path in cors-contract.ts, or the package that moved.',
    );
  }
}
