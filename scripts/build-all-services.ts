import { execFileSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import path from 'path';

/**
 * Builds all four service deployments exactly as Vercel builds them.
 *
 * This exists because on 2026-08-16 `lint`, `typecheck`, `architecture:check` and the
 * full test suite all passed, the release commit was pushed, `main` went READY — and then
 * every one of the four service accounts failed its remote build with
 * `Can't resolve '@asol/ota-core/publishing'`.
 *
 * Nothing in the repository built a service. Each `services/<name>/` folder is uploaded
 * alone and installed against its own `package.json`, so the root's dependencies and
 * module graph are not there. That difference is invisible to every check that runs at
 * the repository root, and it is the only difference that matters to a service deploy.
 *
 * The mirrors are refreshed first, because a build against a stale mirror proves nothing
 * about what would actually be uploaded.
 */

const SERVICES = ['notifications', 'products', 'orders', 'profiles'] as const;

const ROOT = process.cwd();

function run(command: string, args: string[], cwd: string): void {
  execFileSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32', cwd });
}

function main(): void {
  console.log('[services:build] Refreshing mirrors before building...');
  run('npx', ['tsx', 'scripts/sync-all-service-sources.ts'], ROOT);

  const failures: string[] = [];

  for (const service of SERVICES) {
    const serviceDir = path.join(ROOT, 'services', service);
    if (!existsSync(serviceDir)) {
      failures.push(`${service}: services/${service} is missing`);
      continue;
    }

    console.log(`\n[services:build] Building ${service} the way Vercel builds it...`);
    try {
      // Each service is its own project, not a workspace of the root: a root `npm ci`
      // installs nothing for it. Locally these folders already have `node_modules` from
      // an earlier install, which is why this step passed here and failed on CI with
      // "Next.js package not found". Installing here is also what Vercel does — it
      // installs the uploaded folder against its own package.json and lockfile.
      if (!existsSync(path.join(serviceDir, 'node_modules'))) {
        console.log(`[services:build] ${service}: installing dependencies...`);
        run('npm', ['ci', '--no-audit', '--no-fund'], serviceDir);
      }

      run('npx', ['next', 'build'], serviceDir);
      console.log(`[services:build] ${service}: OK`);
    } catch {
      failures.push(`${service}: next build failed`);
      console.error(`[services:build] ${service}: FAILED`);
    } finally {
      // The build output is not what gets uploaded — the CLI uploads the folder and
      // Vercel builds remotely. Leaving `.next` behind would put a large untracked
      // directory inside a folder that `deploy:all` is about to upload.
      rmSync(path.join(serviceDir, '.next'), { recursive: true, force: true });
    }
  }

  if (failures.length > 0) {
    console.error('\n[services:build] Service builds failed:');
    for (const failure of failures) console.error(`  - ${failure}`);
    console.error(
      '\nThese would have failed on Vercel after the push. Fix them before deploying.',
    );
    process.exit(1);
  }

  console.log(`\n[services:build] All ${SERVICES.length} service deployments build cleanly.`);
}

main();
