#!/usr/bin/env tsx
import { ACCOUNT_DECLARATIONS } from '@asol/account-declarations';

import { foreignRuntimeEnvNames, hostedRuntimeEnvKeys, runtimeAccountFromEnv } from './vercel-deployment-guards';

/**
 * Names-only environment ownership report for one runtime.
 *
 * Values are never read, so the output is safe to paste into an issue or a
 * deployment log. That is the point: the earlier report merged every account's
 * requirements into one list, which meant it could say a key was missing but
 * never that a key was present in a deployment that has no code to use it.
 *
 * Exits non-zero when the runtime holds a foreign deployment token, because that
 * is the one finding that is never a false positive: a project that can deploy
 * another account is not isolated from it.
 */
const runtime = runtimeAccountFromEnv();
const declaration = ACCOUNT_DECLARATIONS[runtime]!;
const required = hostedRuntimeEnvKeys(runtime);
const missing = required.filter((key) => !process.env[key]?.trim());
const foreign = foreignRuntimeEnvNames(runtime);

console.log(`Runtime: ${runtime} (Vercel project "${declaration.project}")`);
console.log(`Declared required: ${required.length}, optional: ${declaration.optionalEnv.length}`);
console.log(missing.length ? `Missing required: ${missing.join(', ')}` : 'Missing required: none');

if (foreign.length === 0) {
  console.log('Undeclared secret names present: none');
} else {
  console.log('Undeclared secret names present:');
  for (const finding of foreign) {
    const owner = finding.declaredBy.length ? finding.declaredBy.join(', ') : 'no declared account';
    console.log(`  ${finding.name}  [${finding.family}]  declared by: ${owner}`);
  }
}

const foreignDeployTokens = foreign.filter((finding) => finding.family === 'deployment credential');
if (foreignDeployTokens.length > 0) {
  console.error(
    `❌ ${runtime} holds deployment credentials it does not declare: ` +
      `${foreignDeployTokens.map((finding) => finding.name).join(', ')}. ` +
      'A runtime that can deploy another account is not isolated from it.',
  );
  process.exit(1);
}

console.log('✅ Runtime environment ownership verified (names only).');
