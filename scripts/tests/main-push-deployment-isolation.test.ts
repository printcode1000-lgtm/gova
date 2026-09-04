import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');
const vercel = JSON.parse(read('vercel.json')) as { git?: { deploymentEnabled?: Record<string, boolean> } };
const packageJson = JSON.parse(read('package.json')) as { scripts?: Record<string, string> };
const workflows = readdirSync(path.join(root, '.github', 'workflows')).filter((file) => /\.ya?ml$/i.test(file)).sort();

assert.deepEqual(vercel.git?.deploymentEnabled, { '*': false, main: false });
assert.deepEqual(workflows, ['docs.yml', 'local-agent-bootstrap.yml']);
assert.equal(existsSync(path.join(root, '.github', 'workflows', 'deploy-main.yml')), false);
for (const script of ['deploy:revision', 'deploy:redeploy-main', 'deploy:push', 'deploy:push:main', 'deploy:push:all', 'deploy:all:services', 'deploy:all:main', 'deploy:all:preflight', 'deploy:all:publish', 'deploy:env:push']) {
  assert.equal(script in (packageJson.scripts ?? {}), false, `${script} must not be callable.`);
}
assert.equal(packageJson.scripts?.['deploy:push:fast'], 'npx tsx scripts/deploy-push.ts --fast --vercel-target=all');
assert.match(read('scripts/deploy-push.ts'), /if \(!flags\.fast\) \{/);
assert.match(read('packages/vercel-deploy-core/src/index.ts'), /Direct Vercel account deployment is disabled/);
assert.match(read('scripts/deploy-service.ts'), /assertReleaseDeploymentContext/);
assert.match(read('scripts/deploy-control-service.ts'), /assertReleaseDeploymentContext/);
assert.match(read('scripts/deploy-main-app.ts'), /assertReleaseDeploymentContext/);
assert.match(read('scripts/run-remote-deploy-all.mjs'), /\["run", "deploy:push:fast"\]/);
assert.doesNotMatch(read('.githooks/pre-push.d/10-main-only'), /deploy|vercel/i);

console.log('Main-push deployment isolation contract passed.');
