#!/usr/bin/env tsx
import { rmSync } from 'node:fs';
import path from 'node:path';

import { isBusinessApiPath, resolveRouteOwner } from '@asol/account-bridge/routes';
import {
  GOVA_DEPLOYMENT_DIR,
  buildGovaDeploymentTree,
  govaDeploymentManifest,
} from '@asol/gova-deployment-core';

/**
 * Generates the gova deployment build view, or verifies what it would contain.
 *
 * `--check` is the drift gate, and it does not read a previously written view:
 * the view is deterministic, so the question worth asking is not "does the copy
 * match" but "does the classification still hold". It cross-checks the manifest
 * against the canonical ownership registry — every route gova omits must have an
 * owner that will answer it, and every route gova keeps must be one no other
 * runtime owns. A business route added without an owner fails here rather than
 * shipping as a 404 behind the compatibility boundary.
 */
function routeToPathname(file: string): string {
  return `/${file.replace(/^src\/app\//, '').replace(/\/route\.tsx?$/, '')}`
    .replace(/\/\([^)]*\)/g, '');
}

function check(root: string): void {
  const manifest = govaDeploymentManifest(root);
  const failures: string[] = [];

  for (const file of manifest.omittedRouteModules) {
    const pathname = routeToPathname(file);
    if (!isBusinessApiPath(pathname)) continue;
    const owned = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'].some(
      (method) => resolveRouteOwner(method, pathname) !== null,
    );
    if (!owned) {
      failures.push(`${file} is omitted from gova but no runtime owns ${pathname}.`);
    }
  }

  for (const file of manifest.keptRouteModules) {
    const pathname = routeToPathname(file);
    if (isBusinessApiPath(pathname)) {
      failures.push(`${file} stays in the gova artifact but ${pathname} is a Business API path.`);
    }
  }

  if (failures.length > 0) {
    console.error('❌ gova deployment view drift:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(
    `✅ gova deployment view verified: ${manifest.keptRouteModules.length} route kept, ` +
      `${manifest.omittedRouteModules.length} omitted, every omitted business route owned.`,
  );
}

const root = process.cwd();

if (process.argv.includes('--check')) {
  check(root);
} else {
  check(root);
  const manifest = buildGovaDeploymentTree(root);
  console.log(
    `✅ gova deployment view written to ${GOVA_DEPLOYMENT_DIR}: ` +
      `${manifest.keptRouteModules.length} API route kept, ${manifest.omittedRouteModules.length} omitted.`,
  );
}

if (process.argv.includes('--clean')) {
  rmSync(path.join(root, GOVA_DEPLOYMENT_DIR), { recursive: true, force: true });
}
