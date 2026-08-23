import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { ACCOUNT_DECLARATIONS } from '@asol/account-declarations';

import {
  cloudAccountsGlance,
  listR2CloudAccounts,
  listVercelCloudAccounts,
  OTA_R2_CLOUD_ACCOUNT,
  TURSO_CLOUD_ACCOUNTS,
} from '../presentation/cloud-accounts-reference';

/**
 * /dev/cloud-accounts must stay complete when an account is added anywhere.
 *
 * Vercel and R2 account rows are derived from sealed packages; Turso rows live in
 * `cloud-accounts-reference.ts` (there is no Turso registry object in the tree).
 * This test is what makes updating that reference mandatory rather than customary.
 */

const REFERENCE_PATH = 'src/features/super-admin/presentation/cloud-accounts-reference.ts';
const CONTENT_PATH = 'src/features/super-admin/presentation/SuperAdminCloudAccountsContent.tsx';

const contentSource = readFileSync(path.join(process.cwd(), CONTENT_PATH), 'utf8');
assert.match(
  contentSource,
  /from\s+["']\.\/cloud-accounts-reference["']/,
  `${CONTENT_PATH} must render from cloud-accounts-reference (not a parallel hardcoded table)`,
);

const vercelRows = listVercelCloudAccounts();
const r2Rows = listR2CloudAccounts();
const glance = cloudAccountsGlance();

for (const declaration of Object.values(ACCOUNT_DECLARATIONS)) {
  assert.ok(
    declaration.email.includes('@'),
    `Vercel declaration "${declaration.name}" has a malformed email: "${declaration.email}"`,
  );
  const row = vercelRows.find((entry) => entry.name === declaration.name);
  assert.ok(
    row,
    `Vercel account "${declaration.name}" is declared but missing from ${REFERENCE_PATH}`,
  );
  assert.equal(row.email, declaration.email);
  assert.equal(row.project, declaration.project);
  assert.ok(row.accountLabel.trim(), `Vercel account "${declaration.name}" needs a display label`);
  assert.ok(row.servesAr.trim(), `Vercel account "${declaration.name}" needs Arabic serves text`);
  assert.ok(row.updatedByAr.trim(), `Vercel account "${declaration.name}" needs an updated-by value`);
}

assert.equal(
  vercelRows.length,
  Object.keys(ACCOUNT_DECLARATIONS).length,
  'the cloud-accounts reference must list exactly as many Vercel accounts as @asol/account-declarations declares',
);

const registrySource = readFileSync(
  path.join(process.cwd(), 'packages/storage-core/src/domain/accounts/account-registry.ts'),
  'utf8',
);
const registryEmails = [...registrySource.matchAll(/^\s*email:\s*'([^']+)'/gm)].map((m) => m[1]);
assert.ok(registryEmails.length > 0, 'the storage account registry must declare emails');
for (const email of registryEmails) {
  assert.ok(
    r2Rows.some((row) => row.email === email),
    `R2 account ${email} is in the storage registry but missing from ${REFERENCE_PATH}`,
  );
}
assert.ok(
  r2Rows.some((row) => row.email === OTA_R2_CLOUD_ACCOUNT.email && row.id === 'ota'),
  'OTA R2 must remain an explicit column (it is not in the storage registry)',
);
assert.ok(
  r2Rows.length >= registryEmails.length,
  'the page lists fewer R2 accounts than the storage registry declares',
);

for (const account of TURSO_CLOUD_ACCOUNTS) {
  assert.ok(
    account.email.includes('@') && !account.email.includes(' '),
    `Turso account "${account.account}" has no email (found "${account.email}")`,
  );
  assert.ok(account.databases > 0, `Turso account "${account.account}" must declare a database count`);
}

assert.equal(glance.vercel, vercelRows.length);
assert.equal(glance.turso, TURSO_CLOUD_ACCOUNTS.length);
assert.equal(glance.r2, r2Rows.length);
assert.equal(
  glance.tursoDatabases,
  TURSO_CLOUD_ACCOUNTS.reduce((sum, row) => sum + row.databases, 0),
);

console.log(
  'cloud-accounts: ' +
    `Vercel ${vercelRows.length}, Turso ${TURSO_CLOUD_ACCOUNTS.length}, Cloudflare R2 ${r2Rows.length}` +
    ' — every account has an email, and every stated count matches.',
);
