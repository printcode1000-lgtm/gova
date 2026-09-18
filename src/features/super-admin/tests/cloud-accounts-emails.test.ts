import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { ACCOUNT_DECLARATIONS } from '@asol/account-declarations';
import { ROUTE_OWNERSHIP } from '@asol/account-bridge/routes';

import {
  cloudAccountsGlance,
  listR2CloudAccounts,
  listVercelCloudAccounts,
  OTA_R2_CLOUD_ACCOUNT,
  TURSO_CLOUD_ACCOUNTS,
} from '../presentation/cloud-accounts-reference';
import { cloudAccountRouteGroups } from '../presentation/cloud-account-routes';

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
assert.match(
  contentSource,
  /<CloudAccountRoutesSection\b/,
  `${CONTENT_PATH} must render the route ownership section from CloudAccountRoutesSection`,
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
  assert.ok(
    row.usage.edgeRequestsLimit > 0,
    `Vercel account "${declaration.name}" must declare an edge request limit`,
  );
  assert.ok(
    row.usage.deploymentsPerDayLimit > 0,
    `Vercel account "${declaration.name}" must declare a deployment limit`,
  );
  assert.ok(
    row.usage.buildsPerHourLimit > 0,
    `Vercel account "${declaration.name}" must declare a build limit`,
  );
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
for (const row of r2Rows) {
  assert.ok(row.usage.classAOperationsLimit > 0, `R2 account "${row.id}" must declare a Class A limit`);
  assert.ok(row.usage.classBOperationsLimit > 0, `R2 account "${row.id}" must declare a Class B limit`);
  assert.ok(row.usage.storageBytesLimit > 0, `R2 account "${row.id}" must declare a storage limit`);
  if (row.usage.status === 'ok') {
    assert.equal(
      typeof row.usage.classAOperations,
      'number',
      `R2 account "${row.id}" ok usage must include Class A operations`,
    );
    assert.equal(
      typeof row.usage.classBOperations,
      'number',
      `R2 account "${row.id}" ok usage must include Class B operations`,
    );
    assert.ok(row.usage.capturedAt, `R2 account "${row.id}" ok usage must include capturedAt`);
  }
}

for (const account of TURSO_CLOUD_ACCOUNTS) {
  assert.ok(
    account.email.includes('@') && !account.email.includes(' '),
    `Turso account "${account.account}" has no email (found "${account.email}")`,
  );
  assert.ok(account.databases > 0, `Turso account "${account.account}" must declare a database count`);
  assert.ok(
    account.usage.rowsReadLimit > 0,
    `Turso account "${account.account}" must declare a positive rows-read limit`,
  );
  assert.ok(
    account.usage.rowsWrittenLimit > 0,
    `Turso account "${account.account}" must declare a positive rows-written limit`,
  );
  assert.ok(
    account.usage.storageBytesLimit > 0,
    `Turso account "${account.account}" must declare a positive storage limit`,
  );
  assert.ok(
    account.usage.bytesSyncedLimit > 0,
    `Turso account "${account.account}" must declare a positive sync limit`,
  );
  assert.ok(
    account.usage.databasesLimit > 0,
    `Turso account "${account.account}" must declare a positive database-count limit`,
  );
  if (account.usage.status === 'ok') {
    assert.equal(
      typeof account.usage.rowsRead,
      'number',
      `Turso account "${account.account}" ok usage must include rowsRead`,
    );
    assert.equal(
      typeof account.usage.rowsWritten,
      'number',
      `Turso account "${account.account}" ok usage must include rowsWritten`,
    );
    assert.ok(account.usage.capturedAt, `Turso account "${account.account}" ok usage must include capturedAt`);
  }
}

assert.equal(glance.vercel, vercelRows.length);
assert.equal(glance.turso, TURSO_CLOUD_ACCOUNTS.length);
assert.equal(glance.r2, r2Rows.length);
assert.equal(
  glance.tursoDatabases,
  TURSO_CLOUD_ACCOUNTS.reduce((sum, row) => sum + row.databases, 0),
);

const routeGroups = cloudAccountRouteGroups();
function routeRowsByOwner(
  entries: readonly {
    readonly owner: string;
    readonly pattern: string;
    readonly methods: readonly string[];
    readonly description: string;
  }[],
) {
  const byOwner = new Map<string, { pattern: string; methods: readonly string[]; description: string }[]>();
  for (const entry of entries) {
    const list = byOwner.get(entry.owner) ?? [];
    list.push({
      pattern: entry.pattern,
      methods: entry.methods,
      description: entry.description,
    });
    byOwner.set(entry.owner, list);
  }
  return [...byOwner.entries()].map(([owner, patterns]) => ({ owner, patterns }));
}

const renderedRouteGroups = routeGroups.map((group) => ({
  owner: group.owner,
  patterns: group.patterns.map((entry) => ({
    pattern: entry.pattern,
    methods: entry.methods,
    description: entry.description,
  })),
}));
const canonicalRouteGroups = routeRowsByOwner(ROUTE_OWNERSHIP);
assert.deepEqual(
  renderedRouteGroups,
  canonicalRouteGroups,
  'the cloud-account route section must render the canonical @asol/account-bridge/routes registry exactly',
);
const renderedRoutes = renderedRouteGroups.flatMap((group) => group.patterns);
for (const entry of renderedRoutes) {
  assert.ok(
    entry.description.trim().length > 0,
    `route ${entry.pattern} must describe what the request does`,
  );
}

function routePatternMatches(pattern: string, route: string): boolean {
  const wildcard = pattern.endsWith('/**');
  const base = wildcard ? pattern.slice(0, -3) : pattern;
  const expression = base
    .split('/')
    .map((segment) => {
      if (/^\[[^\]]+\]$/.test(segment)) return '[^/]+';
      return segment.replace(/[.*+?^${}()|\\]/g, '\\$&');
    })
    .join('/');
  return new RegExp(`^${expression}${wildcard ? '(?:/.*)?' : ''}$`).test(route);
}

const apiInventory = execFileSync('npx', ['tsx', 'scripts/api-route-inventory.ts'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});
const missingFromRouteTables = apiInventory
  .split('\n')
  .filter(Boolean)
  .map((line) => {
    const [method, route, owner, file] = line.split('\t');
    return { method: method!, route: route!, owner: owner!, file: file! };
  })
  .filter((entry) => entry.owner !== 'gova/dev')
  .filter((entry) => {
    const group = renderedRouteGroups.find((candidate) => candidate.owner === entry.owner);
    return !group?.patterns.some(
      (pattern) =>
        pattern.methods.includes(entry.method) &&
        routePatternMatches(pattern.pattern, entry.route),
    );
  });

assert.deepEqual(
  missingFromRouteTables,
  [],
  'Every business API route+method must appear under its owner in the /dev/cloud-accounts route tables:\n' +
    missingFromRouteTables
      .map((entry) => `  - ${entry.method} ${entry.route} -> ${entry.owner} (${entry.file})`)
      .join('\n'),
);

console.log(
  'cloud-accounts: ' +
    `Vercel ${vercelRows.length}, Turso ${TURSO_CLOUD_ACCOUNTS.length}, Cloudflare R2 ${r2Rows.length}` +
    `, route patterns ${renderedRoutes.length}` +
    ' — every account has an email, every stated count matches, every route has a request description, and every business API appears under its owner.',
);
