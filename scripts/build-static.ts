#!/usr/bin/env tsx
import { categoryService } from '@/features/categories';
import { configureOtaCore } from '@asol/ota-core';
import {
  assertReleaseStaticBundle,
  buildStaticOut,
} from '@asol/ota-core/publishing';

import { loadReleaseEnvironment } from './load-release-env';

/**
 * Composition root for the static release build.
 *
 * `@asol/ota-core` audits the generated `out/` tree against the category
 * registry, and reads that registry through a port — a capability package may
 * not import `@/`. Nothing registered the port on this path, so `build:static`
 * died with `otaCorePort: categories is not configured` after a successful
 * `next build`, taking `deploy:all` preflight with it.
 *
 * The server has `src/instrumentation.ts` for exactly this and the browser has
 * its own bootstrap; the static build had no equivalent. This is it. The audit
 * stays in ota-core and the category logic stays in the feature that owns it —
 * neither is reimplemented here, only wired.
 *
 * Release-tool env is loaded first so a missing process value is filled from
 * `.env.local` → `.env` → `fastlane/.env` — the same contract as `ota:check`
 * and `release:android`. Static/native bundles bake
 * `ASOL_MOBILE_PUSH_CREDENTIAL_BLOB` from that resolved environment.
 */
loadReleaseEnvironment();

configureOtaCore({
  categories: {
    getMainCategories: () => categoryService.getMainCategories(),
    getCollections: () => categoryService.getCollections(),
    getCategoryTree: (categoryId) => categoryService.getCategoryTree(categoryId),
  },
});

async function main(): Promise<void> {
  // Used by cap:sync and cap:copy — validate the existing bundle, do not rebuild.
  if (process.argv.includes('--assert-only')) {
    assertReleaseStaticBundle();
    console.log('✅ Release static bundle is valid.');
    return;
  }

  const result = await buildStaticOut({
    diagnostic: process.argv.includes('--diagnostic'),
  });
  if (!result.ok) {
    console.error(`❌ Static build failed: ${result.error.message}`);
    // The wrapper's message names the stage, not the fault. Without the cause a
    // build failure reads as "the pipeline failed" with nothing to act on.
    const cause = (result.error as { details?: unknown }).details;
    if (cause instanceof Error) console.error(cause.stack ?? cause.message);
    else if (cause !== undefined) console.error(cause);
    process.exit(1);
  }
  console.log(
    `✅ Static out built successfully: ${result.value.fileCount} files, ${Math.ceil(result.value.totalBytes / 1024)} KB`,
  );
}

main().catch((error) => {
  console.error('❌ Unexpected build-out error:', error);
  process.exit(1);
});
