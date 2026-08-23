import { existsSync, readFileSync, readdirSync } from 'fs';
import path from 'path';

import { ROOT, addViolation, rel } from './architecture-types';

/**
 * A page must be renderable by every runtime target that ships it.
 *
 * `output: "export"` prerenders every route to files for `out/`, which is what
 * Android and iOS both ship. It rejects `export const dynamic = "force-dynamic"`
 * outright — `next build` exits and takes the release with it. That is not a
 * theoretical risk: a page gained the directive, `build:static` refused it, and
 * the release failed. Removing the directive then failed the release a second
 * time, because the exported page's `"use client"` tree carried an inventory of
 * server environment variable names into a static chunk.
 *
 * Neither failure is visible from the file being edited, and neither is caught
 * until a full static build runs — minutes into a release, after every other
 * gate has passed. This check answers the same question in seconds.
 *
 * The rule: a route may declare `force-dynamic` only if the static build never
 * sees it, which means a prefix of its path is in `STATIC_ROUTE_IGNORELIST`.
 *
 * Documented in `docs/01-architecture/06-runtime-boundaries/runtime-targets.md`.
 */
const IGNORELIST_FILE = 'packages/ota-core/src/publishing/build/out-runtime-config.ts';

function staticRouteIgnorelist(): readonly string[] {
  const file = path.join(ROOT, IGNORELIST_FILE);
  if (!existsSync(file)) return [];
  const source = readFileSync(file, 'utf8');
  const block = /STATIC_ROUTE_IGNORELIST\s*=\s*\[([\s\S]*?)\]/.exec(source);
  if (!block) return [];
  return [...block[1].matchAll(/["']([^"']+)["']/g)].map((match) => match[1]);
}

function appPages(directory: string, found: string[] = []): string[] {
  if (!existsSync(directory)) return found;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) appPages(entryPath, found);
    else if (entry.name === 'page.tsx') found.push(entryPath);
  }
  return found;
}

export function checkRuntimeTargetContract(): void {
  const ignorelist = staticRouteIgnorelist();
  if (ignorelist.length === 0) return;

  for (const page of appPages(path.join(ROOT, 'src', 'app'))) {
    const source = readFileSync(page, 'utf8');
    if (!/dynamic\s*=\s*["']force-dynamic["']/.test(source)) continue;

    // rel() gives src/app/<route>/page.tsx; the ignorelist is app/<route>.
    const route = rel(page).replace(/^src\//, '').replace(/\/page\.tsx$/, '');
    const excluded = ignorelist.some(
      (entry) => route === entry || route.startsWith(`${entry}/`),
    );
    if (excluded) continue;

    addViolation(
      'Runtime Target',
      page,
      `${route} declares force-dynamic but is part of the static export.`,
      `output: "export" rejects a force-dynamic page and fails build:static. Either drop the directive, or add a covering prefix to STATIC_ROUTE_IGNORELIST in ${IGNORELIST_FILE} — a development-only page needs that entry and an isDevelopment guard.`,
    );
  }
}
