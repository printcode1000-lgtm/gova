import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

import ts from "typescript";

import { ACCOUNT_DECLARATIONS } from "@asol/account-declarations";
import { ROUTE_OWNERSHIP } from "@asol/account-bridge/routes";
import { LOGICAL_DATABASE_LABELS } from "@asol/data-core/provisioning";

import { readEnvFiles } from "@asol/env-core/files";

import { readTursoDatabaseInventory } from "../../../app/dev/cloud-accounts/turso-database-inventory";
import { buildCloudAccountsFacts } from "../server/services/cloud-accounts-facts";
import { OTA_R2_CLOUD_ACCOUNT } from "../server/services/cloud-accounts-ota-account";
import { listTursoOrganizationKeys } from "../server/services/cloud-accounts-turso-organizations";

/**
 * /dev/cloud-accounts must stay complete, and must say nothing the code does not.
 *
 * The page renders `CloudAccountsFacts`, which the server derives from account
 * declarations, the route-ownership registry, the storage registries, the OTA
 * target, the desired-schema manifests, the environment contract and
 * `package.json`; account identities (Vercel team slug, token owners, Turso
 * databases) come from the providers through the snapshot and live reads. No
 * hand-written account table exists. This test proves the derivation is complete
 * and that the presentation files paint no copy of their own.
 */

const REFERENCE_PATH = "the cloud-accounts facts";
const PRESENTATION_DIR = "src/features/super-admin/presentation";
const CONTENT_PATH = `${PRESENTATION_DIR}/SuperAdminCloudAccountsContent.tsx`;
const COPY_FREE_COMPONENTS = [
  "SuperAdminCloudAccountsContent.tsx",
  "SuperAdminCloudAccountsPage.tsx",
  "CloudAccountsGeneralTab.tsx",
  "CloudAccountsVercelTab.tsx",
  "CloudAccountsTursoTab.tsx",
  "CloudAccountsCloudflareTab.tsx",
  "CloudAccountsPrimitives.tsx",
  "CloudAccountRoutesSection.tsx",
];

const contentSource = readFileSync(
  path.join(process.cwd(), CONTENT_PATH),
  "utf8",
);
assert.match(
  contentSource,
  /facts: CloudAccountsFacts/,
  `${CONTENT_PATH} must render server-derived CloudAccountsFacts (not a parallel hardcoded table)`,
);
assert.doesNotMatch(
  contentSource,
  /from\s+["']\.\/cloud-accounts-reference["']/,
  `${CONTENT_PATH} must not read the reference directly; facts arrive as props`,
);
// Live refresh on tab activation is proven by cloud-accounts-live-refresh.test.ts.

const vercelTabSource = readFileSync(
  path.join(process.cwd(), PRESENTATION_DIR, "CloudAccountsVercelTab.tsx"),
  "utf8",
);
assert.match(
  vercelTabSource,
  /<CloudAccountRoutesSection\b/,
  "the Vercel tab must render the route ownership section from CloudAccountRoutesSection",
);
assert.match(
  vercelTabSource,
  /vercelAvailableUsageMetrics/,
  "the Vercel tab must hide Vercel usage metrics that the provider did not return",
);
assert.doesNotMatch(
  vercelTabSource,
  /\{account\.usage\.metrics\.map/,
  "the Vercel tab must not render every default Vercel metric when usage is unsupported",
);
const formatSource = readFileSync(
  path.join(process.cwd(), PRESENTATION_DIR, "cloud-accounts-format.ts"),
  "utf8",
);
assert.match(formatSource, /vercelAvailableUsageMetrics[\s\S]*usedDisplay !== null/);

/**
 * Every word lives in `cloud-accounts-copy.ts`; the components paint only what
 * they are given. A JSX text node holding a letter, or a string literal with an
 * Arabic letter, would be a second copy of a fact or a label.
 */
for (const file of COPY_FREE_COMPONENTS) {
  const source = readFileSync(path.join(process.cwd(), PRESENTATION_DIR, file), "utf8");
  assert.doesNotMatch(
    source,
    /(?:R2|ASOL_OTA_R2|PRODUCT_R2|APPAREL_PETS_R2)_API_TOKEN|TURSO_[A-Z0-9_]*API_TOKEN|process\.env/,
    `${file} must never contain cloud secret env names or read server environment values`,
  );
  assert.doesNotMatch(
    source,
    /[\u0600-\u06FF]/,
    `${file} must not hold Arabic copy; wording belongs in cloud-accounts-copy.ts`,
  );
  const jsxText: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isJsxText(node) && /\p{L}/u.test(node.text)) jsxText.push(node.text.trim());
    if (ts.isStringLiteral(node) && ts.isJsxAttribute(node.parent) && /\p{L}/u.test(node.text)) {
      const name = node.parent.name.getText();
      if (name === "aria-label" || name === "title" || name === "placeholder") jsxText.push(node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX));
  assert.deepEqual(
    jsxText,
    [],
    `${file} must not paint literal JSX text; wording belongs in cloud-accounts-copy.ts`,
  );
}

const liveRouteSource = readFileSync(
  path.join(process.cwd(), "src/app/api/dev/cloud-accounts/r2-usage/route.ts"),
  "utf8",
);
assert.match(
  liveRouteSource,
  /assertDevelopmentToolingAllowed\([^)]*strict:\s*true/s,
);
assert.match(liveRouteSource, /assertSuperAdminRequest\(request\)/);

const tursoLiveRouteSource = readFileSync(
  path.join(
    process.cwd(),
    "src/app/api/dev/cloud-accounts/turso-usage/route.ts",
  ),
  "utf8",
);
assert.match(
  tursoLiveRouteSource,
  /assertDevelopmentToolingAllowed\([^)]*strict:\s*true/s,
);
assert.match(tursoLiveRouteSource, /assertSuperAdminRequest\(request\)/);

const tursoLiveServiceSource = readFileSync(
  path.join(
    process.cwd(),
    "src/features/super-admin/server/services/cloud-accounts-turso-usage.server.ts",
  ),
  "utf8",
);
assert.match(tursoLiveServiceSource, /listTursoOrganizationKeys\(\)/, "live Turso reads must cover every contract organization");
assert.match(tursoLiveServiceSource, /readTursoOrganizationRow/);

const tursoProviderSource = readFileSync(
  path.join(
    process.cwd(),
    "packages/data-core/src/domains/turso-platform/providers/turso-platform-usage.provider.ts",
  ),
  "utf8",
);
assert.match(tursoProviderSource, /['"]usage['"]/);
assert.match(tursoProviderSource, /['"]subscription['"]/);
assert.match(tursoProviderSource, /['"]plans['"]/);

const localEnv = readEnvFiles();
const facts = buildCloudAccountsFacts({
  tursoInventory: readTursoDatabaseInventory(),
  readEnv: (key) => localEnv[key],
});
const vercelRows = facts.vercel;
const r2Rows = facts.r2;

for (const declaration of Object.values(ACCOUNT_DECLARATIONS)) {
  assert.ok(
    declaration.email.includes("@"),
    `Vercel declaration "${declaration.name}" has a malformed email: "${declaration.email}"`,
  );
  const row = vercelRows.find((entry) => entry.name === declaration.name);
  assert.ok(
    row,
    `Vercel account "${declaration.name}" is declared but missing from ${REFERENCE_PATH}`,
  );
  assert.equal(row.email, declaration.email);
  assert.equal(row.project, declaration.project);
  assert.ok(
    row.usage.status !== "ok" || row.usage.teamSlug,
    `Vercel account "${declaration.name}" snapshot must carry the team slug Vercel reports`,
  );
  assert.ok(
    row.usage.status !== "ok" || row.usage.planLabel,
    `Vercel account "${declaration.name}" snapshot must carry the plan Vercel reports`,
  );
  assert.ok(
    !row.usage.ownerEmail || row.usage.ownerEmail === declaration.email,
    `Vercel account "${declaration.name}" is declared for ${declaration.email} but its token belongs to ${row.usage.ownerEmail}`,
  );
  assert.ok(
    row.ownedRoutePatterns.length > 0 || (row.servesFrontend && facts.govaBoundary?.project === row.project),
    `Vercel account "${declaration.name}" must own routes or be the frontend boundary`,
  );
  assert.ok(
    row.deployCommand,
    `Vercel account "${declaration.name}" has no package.json deploy script`,
  );
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
  "the cloud-accounts reference must list exactly as many Vercel accounts as @asol/account-declarations declares",
);

const registrySource = readFileSync(
  path.join(
    process.cwd(),
    "packages/storage-core/src/domain/accounts/account-registry.ts",
  ),
  "utf8",
);
const registryEmails = [
  ...registrySource.matchAll(/^\s*email:\s*'([^']+)'/gm),
].map((m) => m[1]);
assert.ok(
  registryEmails.length > 0,
  "the storage account registry must declare emails",
);
for (const email of registryEmails) {
  assert.ok(
    r2Rows.some((row) => row.email === email),
    `R2 account ${email} is in the storage registry but missing from ${REFERENCE_PATH}`,
  );
}
assert.ok(
  r2Rows.some(
    (row) => row.email === OTA_R2_CLOUD_ACCOUNT.email && row.id === "ota",
  ),
  "OTA R2 must remain an explicit column (it is not in the storage registry)",
);
assert.ok(
  r2Rows.length >= registryEmails.length,
  "the page lists fewer R2 accounts than the storage registry declares",
);
for (const row of r2Rows) {
  assert.ok(
    row.usage.classAOperationsLimit > 0,
    `R2 account "${row.id}" must declare a Class A limit`,
  );
  assert.ok(
    row.usage.classBOperationsLimit > 0,
    `R2 account "${row.id}" must declare a Class B limit`,
  );
  assert.ok(
    row.usage.storageBytesLimit > 0,
    `R2 account "${row.id}" must declare a storage limit`,
  );
  assert.ok(
    row.contents.capturedAt,
    `R2 account "${row.id}" must include a bucket contents snapshot`,
  );
  assert.equal(
    typeof row.contents.objectCount,
    "number",
    `R2 account "${row.id}" contents snapshot must include an object count`,
  );
  assert.equal(
    typeof row.contents.totalSizeBytes,
    "number",
    `R2 account "${row.id}" contents snapshot must include a byte total`,
  );
  if (row.usage.status === "ok") {
    assert.equal(
      typeof row.usage.classAOperations,
      "number",
      `R2 account "${row.id}" ok usage must include Class A operations`,
    );
    assert.equal(
      typeof row.usage.classBOperations,
      "number",
      `R2 account "${row.id}" ok usage must include Class B operations`,
    );
    assert.ok(
      row.usage.capturedAt,
      `R2 account "${row.id}" ok usage must include capturedAt`,
    );
  }
}

for (const account of facts.turso) {
  assert.ok(
    account.usage.status !== "ok" || account.usage.ownerEmail?.includes("@"),
    `Turso organization "${account.organization}" snapshot must carry its token owner's email`,
  );
  assert.ok(
    account.databases.length > 0,
    `Turso organization "${account.organization}" must hold at least one logical database`,
  );
  for (const database of account.databases) {
    assert.ok(
      database.tables.length > 0,
      `Turso database "${database.label}" must declare tables in its desired schema`,
    );
  }
  assert.ok(
    account.usage.rowsReadLimit > 0,
    `Turso organization "${account.organization}" must declare a positive rows-read limit`,
  );
  assert.ok(
    account.usage.rowsWrittenLimit > 0,
    `Turso organization "${account.organization}" must declare a positive rows-written limit`,
  );
  assert.ok(
    account.usage.storageBytesLimit > 0,
    `Turso organization "${account.organization}" must declare a positive storage limit`,
  );
  assert.ok(
    account.usage.bytesSyncedLimit > 0,
    `Turso organization "${account.organization}" must declare a positive sync limit`,
  );
  assert.ok(
    account.usage.databasesLimit > 0,
    `Turso organization "${account.organization}" must declare a positive database-count limit`,
  );
  if (account.usage.status === "ok") {
    assert.equal(
      typeof account.usage.rowsRead,
      "number",
      `Turso organization "${account.organization}" ok usage must include rowsRead`,
    );
    assert.equal(
      typeof account.usage.rowsWritten,
      "number",
      `Turso organization "${account.organization}" ok usage must include rowsWritten`,
    );
    assert.ok(
      account.usage.capturedAt,
      `Turso organization "${account.organization}" ok usage must include capturedAt`,
    );
  }
}

assert.deepEqual(facts.tursoUnassigned, [], "every logical database URL must point at a contract organization");
assert.equal(facts.turso.length, listTursoOrganizationKeys().length);
for (const account of facts.turso) {
  if (account.usage.cloudDatabaseNames.length === 0) continue;
  for (const database of account.databases) {
    assert.ok(
      account.usage.cloudDatabaseNames.includes(database.cloudName),
      `${database.label} is configured in ${account.organization} as "${database.cloudName}", which Turso does not report`,
    );
  }
}
const declaredDatabases = facts.turso.flatMap((account) =>
  account.databases.map((database) => database.label),
);
assert.deepEqual(
  [...declaredDatabases].sort(),
  [...LOGICAL_DATABASE_LABELS].sort(),
  "every logical database must belong to exactly one Turso organization",
);

const routeGroups = facts.routeGroups;
function routeRowsByOwner(
  entries: readonly {
    readonly owner: string;
    readonly pattern: string;
    readonly methods: readonly string[];
    readonly description: string;
  }[],
) {
  const byOwner = new Map<
    string,
    { pattern: string; methods: readonly string[]; description: string }[]
  >();
  for (const entry of entries) {
    const list = byOwner.get(entry.owner) ?? [];
    list.push({
      pattern: entry.pattern,
      methods: entry.methods,
      description: entry.description,
    });
    byOwner.set(entry.owner, list);
  }
  return [...byOwner.entries()].map(([owner, patterns]) => ({
    owner,
    patterns,
  }));
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
  "the cloud-account route section must render the canonical @asol/account-bridge/routes registry exactly",
);
const renderedRoutes = renderedRouteGroups.flatMap((group) => group.patterns);
for (const entry of renderedRoutes) {
  assert.ok(
    entry.description.trim().length > 0,
    `route ${entry.pattern} must describe what the request does`,
  );
}

function routePatternMatches(pattern: string, route: string): boolean {
  const wildcard = pattern.endsWith("/**");
  const base = wildcard ? pattern.slice(0, -3) : pattern;
  const expression = base
    .split("/")
    .map((segment) => {
      if (/^\[[^\]]+\]$/.test(segment)) return "[^/]+";
      return segment.replace(/[.*+?^${}()|\\]/g, "\\$&");
    })
    .join("/");
  return new RegExp(`^${expression}${wildcard ? "(?:/.*)?" : ""}$`).test(route);
}

const apiInventory = execFileSync(
  "npx",
  ["tsx", "scripts/api-route-inventory.ts"],
  {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  },
);
const missingFromRouteTables = apiInventory
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [method, route, owner, file] = line.split("\t");
    return { method: method!, route: route!, owner: owner!, file: file! };
  })
  .filter((entry) => entry.owner !== "gova/dev")
  .filter((entry) => {
    const group = renderedRouteGroups.find(
      (candidate) => candidate.owner === entry.owner,
    );
    return !group?.patterns.some(
      (pattern) =>
        pattern.methods.includes(entry.method) &&
        routePatternMatches(pattern.pattern, entry.route),
    );
  });

assert.deepEqual(
  missingFromRouteTables,
  [],
  "Every business API route+method must appear under its owner in the /dev/cloud-accounts route tables:\n" +
    missingFromRouteTables
      .map(
        (entry) =>
          `  - ${entry.method} ${entry.route} -> ${entry.owner} (${entry.file})`,
      )
      .join("\n"),
);

console.log(
  "cloud-accounts: " +
    `Vercel ${vercelRows.length}, Turso ${facts.turso.length}, Cloudflare R2 ${r2Rows.length}` +
    `, route patterns ${renderedRoutes.length}` +
    " — every account has an email, every R2 account has a contents snapshot, every stated count matches, every route has a request description, and every business API appears under its owner.",
);
