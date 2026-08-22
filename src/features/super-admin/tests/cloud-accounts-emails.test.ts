import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { ACCOUNT_DECLARATIONS } from '@asol/account-declarations';

/**
 * /super-admin/cloud-accounts must stay complete when an account is added anywhere.
 *
 * Two failures this guards against, both of which already happened here. An account id
 * identifies a tenant but does not say who can sign in and issue a new token once the
 * current one is revoked — the apparel/pets R2 account sat on this page with an em dash
 * where its email belonged. And the page's own summary counted three R2 accounts while
 * the table below it listed four, because OTA was added to the table and to nothing else.
 *
 * `AccountDeclaration.email` and `StorageAccountDefinition.email` are required fields, so
 * a Vercel or R2 account added without an email fails `typecheck` before reaching here.
 * What typecheck cannot see is the page. This test is what makes updating it mandatory:
 * every account declared in code must appear here, and every count the page states about
 * itself must match what it actually lists.
 *
 * Turso has no registry object anywhere in the tree — its five accounts are Turso
 * organizations reached through `TURSO_*_ORGANIZATION` — so for Turso this file is the
 * only enforcement that exists, which is why the checks read the page rather than only
 * the declarations.
 */

const EMAIL_HEADING = 'البريد الإلكتروني';

const PAGE_PATH = 'src/features/super-admin/presentation/SuperAdminCloudAccountsContent.tsx';

/** Arabic number words the page writes its counts with, in the section titles and prose. */
const ARABIC_NUMBER_WORDS: Record<string, number> = {
  'ثلاثة': 3,
  'أربعة': 4,
  'خمسة': 5,
  'ستة': 6,
  'سبعة': 7,
};

const pageSource = readFileSync(path.join(process.cwd(), PAGE_PATH), 'utf8');

/** Cell text with tags, JSX expressions, and whitespace stripped down to the value. */
function cellText(cell: string): string {
  return cell
    .replace(/<[^>]*>/g, '')
    .replace(/\{"\s*"\}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function rowsOf(table: string, section: 'thead' | 'tbody'): string[][] {
  const block = table.match(new RegExp(`<${section}[^>]*>([\\s\\S]*?)</${section}>`))?.[1] ?? '';
  return [...block.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((row) =>
    [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((cell) => cellText(cell[1])),
  );
}

const tables = [...pageSource.matchAll(/<TableWrap>([\s\S]*?)<\/TableWrap>/g)].map((m) => m[1]);
assert.ok(tables.length > 0, 'the cloud-accounts page must render at least one table');

/** Accounts found per provider, keyed by the name the page gives that provider. */
const accountsOnPage = new Map<string, string[]>();

for (const table of tables) {
  const header = rowsOf(table, 'thead')[0] ?? [];
  const bodyRows = rowsOf(table, 'tbody');
  const emailColumn = header.indexOf(EMAIL_HEADING);

  if (emailColumn >= 0) {
    // Column-oriented: one account per row. Vercel and Turso are laid out this way.
    const names: string[] = [];
    for (const row of bodyRows) {
      const account = row[0] ?? '(unnamed)';
      const email = row[emailColumn] ?? '';
      assert.ok(
        email.includes('@') && !email.includes(' '),
        `account "${account}" on the cloud-accounts page has no email (found "${email}")`,
      );
      names.push(account);
    }
    assert.ok(names.length > 0, 'a provider table declares an email column but lists no accounts');
    // Keyed by first header cell — "الحساب" for both, so disambiguate by first account name.
    accountsOnPage.set(names[0].startsWith('hesham1') ? 'Turso' : 'Vercel', names);
    continue;
  }

  const emailRow = bodyRows.find((row) => row[0] === EMAIL_HEADING);
  if (!emailRow) continue;

  // Row-oriented: one account per column. Cloudflare R2 is laid out this way.
  const names = header.slice(1);
  for (const [cell, email] of emailRow.slice(1).entries()) {
    assert.ok(
      email.includes('@') && !email.includes(' '),
      `account "${names[cell] ?? `column ${cell + 1}`}" on the cloud-accounts page has no email (found "${email}")`,
    );
  }
  assert.equal(
    emailRow.length - 1,
    names.length,
    'the R2 email row must have one cell per account column',
  );
  accountsOnPage.set('Cloudflare R2', names);
}

for (const provider of ['Vercel', 'Turso', 'Cloudflare R2']) {
  assert.ok(
    accountsOnPage.has(provider),
    `the page must list ${provider} accounts with an email for each`,
  );
}

// ---------------------------------------------------------------------------
// Adding an account in code without adding it to the page must fail here.
// ---------------------------------------------------------------------------

for (const declaration of Object.values(ACCOUNT_DECLARATIONS)) {
  assert.ok(
    declaration.email.includes('@'),
    `Vercel declaration "${declaration.name}" has a malformed email: "${declaration.email}"`,
  );
  assert.ok(
    pageSource.includes(declaration.email),
    `Vercel account "${declaration.name}" (${declaration.email}) is declared in code but missing from ${PAGE_PATH}`,
  );
  assert.ok(
    pageSource.includes(declaration.project),
    `Vercel project "${declaration.project}" is declared in code but missing from ${PAGE_PATH}`,
  );
}

assert.equal(
  accountsOnPage.get('Vercel')?.length,
  Object.keys(ACCOUNT_DECLARATIONS).length,
  'the page must list exactly as many Vercel accounts as @asol/account-declarations declares',
);

// The registry is read as source rather than imported: importing it would pull the
// storage package's runtime into a presentation-layer test.
const registrySource = readFileSync(
  path.join(process.cwd(), 'packages/storage-core/src/domain/accounts/account-registry.ts'),
  'utf8',
);
const registryEmails = [...registrySource.matchAll(/^\s*email:\s*'([^']+)'/gm)].map((m) => m[1]);
assert.ok(registryEmails.length > 0, 'the storage account registry must declare emails');
for (const email of registryEmails) {
  assert.ok(
    pageSource.includes(email),
    `R2 account ${email} is in the storage registry but missing from ${PAGE_PATH}`,
  );
}
// The page carries one R2 account the registry does not: OTA is routed through
// R2_STORAGE_TARGETS rather than the account registry. It may exceed, never fall short.
assert.ok(
  (accountsOnPage.get('Cloudflare R2')?.length ?? 0) >= registryEmails.length,
  'the page lists fewer R2 accounts than the storage registry declares',
);

// ---------------------------------------------------------------------------
// The page's own counts must match what it lists.
// ---------------------------------------------------------------------------

const glanceTable = tables.find((table) =>
  (rowsOf(table, 'thead')[0] ?? []).includes('عدد الحسابات'),
);
assert.ok(glanceTable, 'the page must open with an at-a-glance table of account counts');

for (const row of rowsOf(glanceTable, 'tbody')) {
  const [provider, stated] = row;
  const listed = accountsOnPage.get(provider)?.length;
  assert.ok(listed !== undefined, `at-a-glance names a provider with no table: "${provider}"`);
  assert.equal(
    Number(stated),
    listed,
    `at-a-glance says ${stated} ${provider} accounts, the ${provider} table lists ${listed}`,
  );
}

for (const [, title] of pageSource.matchAll(/<SectionTitle>([^<]*—[^<]*)<\/SectionTitle>/g)) {
  const provider = title.split('—')[0].trim();
  const listed = accountsOnPage.get(provider);
  if (!listed) continue;
  const stated = title.match(/—\s*(\S+)\s*حساب/)?.[1] ?? '';
  const count = ARABIC_NUMBER_WORDS[stated] ?? Number(stated);
  assert.equal(
    count,
    listed.length,
    `section title "${title}" states ${stated}, the table lists ${listed.length}`,
  );
}

console.log(
  'cloud-accounts: ' +
    [...accountsOnPage].map(([provider, names]) => `${provider} ${names.length}`).join(', ') +
    ' — every account has an email, and every stated count matches.',
);
