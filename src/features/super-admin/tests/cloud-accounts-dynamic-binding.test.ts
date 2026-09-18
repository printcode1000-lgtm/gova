import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ROUTE_OWNERSHIP } from "@asol/account-bridge/routes";
import { ACCOUNT_DECLARATIONS, type AccountDeclaration } from "@asol/account-declarations";
import {
  credentialKeysFor,
  DESIRED_SCHEMAS,
  LOGICAL_DATABASE_LABELS,
  type LogicalDatabaseLabel,
} from "@asol/data-core/provisioning";
import { readEnvFiles } from "@asol/env-core/files";
import { CANONICAL_LOCAL_ENV_FILE } from "@asol/env-core/process";
import { getOtaPrefix, OTA_R2_STORAGE_TARGET } from "@asol/ota-core/publishing";
import { getAllStorageAccounts } from "@asol/storage-core";
import { getAllStorageProfiles } from "@asol/storage-core/server";

import { CLOUD_ACCOUNTS_COPY } from "../presentation/cloud-accounts-copy";
import { cloudAccountsBridgeDiagram } from "../presentation/cloud-accounts-bridge-diagram";
import type { CloudAccountsFacts } from "../presentation/cloud-accounts-facts.types";
import type { RichText } from "../presentation/cloud-accounts-rich-text";
import { CloudAccountsCloudflareTab } from "../presentation/CloudAccountsCloudflareTab";
import { CloudAccountsGeneralTab } from "../presentation/CloudAccountsGeneralTab";
import { CloudAccountsTursoTab } from "../presentation/CloudAccountsTursoTab";
import { CloudAccountsVercelTab } from "../presentation/CloudAccountsVercelTab";
import { readTursoDatabaseInventory } from "../../../app/dev/cloud-accounts/turso-database-inventory";
import { buildCloudAccountsFacts } from "../server/services/cloud-accounts-facts";
import {
  deployCommandFor,
  gitAutoDeployFor,
  isGitIgnored,
  npmCommand,
} from "../server/services/cloud-accounts-repository-facts";
import { listTursoOrganizationKeys } from "../server/services/cloud-accounts-turso-organizations";
import { VERCEL_USAGE_SNAPSHOT } from "../presentation/cloud-accounts-vercel-usage-snapshot";
import { TURSO_USAGE_SNAPSHOT } from "../presentation/cloud-accounts-turso-usage-snapshot";

/**
 * The dynamic binding of `/dev/cloud-accounts`.
 *
 * Part 1 proves every fact the server hands the page equals the registry,
 * manifest or file that owns it. Part 2 proves the wording follows the facts —
 * change a fact and the painted text changes. Part 3 renders every tab and
 * proves each derived fact reaches the markup. Any one of these breaking means
 * the page could state something the code no longer says.
 */

const inventory = readTursoDatabaseInventory();
const localEnv = readEnvFiles();
const readEnv = (key: string) => localEnv[key];
const facts = buildCloudAccountsFacts({ tursoInventory: inventory, readEnv });
const declarations = Object.values(ACCOUNT_DECLARATIONS) as AccountDeclaration[];
const packageScripts = (
  JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  }
).scripts;

// ── Part 1: every fact equals its source ────────────────────────────────────

assert.equal(facts.localEnvFile, CANONICAL_LOCAL_ENV_FILE);
assert.equal(facts.localEnvFileGitIgnored, isGitIgnored(CANONICAL_LOCAL_ENV_FILE));
assert.equal(facts.localEnvFileGitIgnored, true, `${CANONICAL_LOCAL_ENV_FILE} must be ignored by Git`);
assert.equal(
  facts.pushVercelEnvProject,
  ACCOUNT_DECLARATIONS.gova!.project,
  "db:push:vercel-env reconciles the project whose declaration its script imports",
);
assert.match(
  readFileSync(path.join(process.cwd(), "packages/architecture-core/src/checks/account-bridge-contract.ts"), "utf8"),
  new RegExp(`addViolation\\(\\s*'${facts.isolationRule}'`),
  "the stated isolation rule must be the check that enforces it",
);

for (const command of Object.values(facts.commands)) {
  const key = command.replace(/^npm run /, "");
  assert.ok(key in packageScripts, `named command "${command}" must exist in package.json`);
}
assert.throws(() => npmCommand(packageScripts, "cloud-accounts:does-not-exist"), /declares no/);

assert.deepEqual(
  facts.vercel.map((account) => [account.name, account.project, account.email]),
  declarations.map((declaration) => [declaration.name, declaration.project, declaration.email]),
  "Vercel rows must be the account declarations, in declaration order",
);
for (const account of facts.vercel) {
  const declaration = ACCOUNT_DECLARATIONS[account.name]!;
  assert.equal(account.serviceDir, declaration.serviceDir ?? null);
  assert.equal(account.declaredEnvCount, declaration.requiredEnv.length + declaration.optionalEnv.length);
  assert.deepEqual(account.usage, VERCEL_USAGE_SNAPSHOT[account.name], `${account.name} usage must be its snapshot row`);
  assert.deepEqual(
    account.ownedRoutePatterns,
    ROUTE_OWNERSHIP.filter((entry) => entry.owner === account.name).map((entry) => entry.pattern),
    `${account.name} must show exactly the patterns ROUTE_OWNERSHIP gives it`,
  );
  assert.equal(account.servesFrontend, declaration.deployFromRepositoryRoot === true);
  assert.ok(account.deployCommand, `${account.name} must resolve a deploy script`);
  assert.ok(
    account.deployCommand!.replace(/^npm run /, "") in packageScripts,
    `${account.name} deploy command must be a real package.json script`,
  );
  assert.equal(account.gitAutoDeploy, gitAutoDeployFor(declaration));
}

// The deploy-script resolver follows package.json, not a table: a synthetic
// script set proves both matching rules and the miss.
const [firstDeclaration] = declarations;
assert.equal(
  deployCommandFor({ "x:deploy": `npx tsx scripts/deploy-service.ts ${firstDeclaration!.name}` }, firstDeclaration!),
  "npm run x:deploy",
);
assert.equal(deployCommandFor({ "x:build": `echo ${firstDeclaration!.name}` }, firstDeclaration!), null);

assert.deepEqual(
  facts.routeGroups.flatMap((group) =>
    group.patterns.map((entry) => [group.owner, entry.pattern, entry.methods.join(","), entry.description]),
  ),
  [...ROUTE_OWNERSHIP]
    .sort((left, right) => {
      const order = [...new Set(ROUTE_OWNERSHIP.map((entry) => entry.owner))];
      return order.indexOf(left.owner) - order.indexOf(right.owner);
    })
    .map((entry) => [entry.owner, entry.pattern, entry.methods.join(","), entry.description]),
  "route groups must be ROUTE_OWNERSHIP grouped by owner",
);

function readersOf(label: LogicalDatabaseLabel): string[] {
  const keys = credentialKeysFor(label).split(" / ");
  return declarations
    .filter((declaration) => [...declaration.requiredEnv, ...declaration.optionalEnv].some((key) => keys.includes(key)))
    .map((declaration) => declaration.project);
}

assert.deepEqual(
  Object.keys(inventory.tablesByDatabase),
  [...LOGICAL_DATABASE_LABELS],
  "the Turso inventory must cover every logical database",
);

const organizationKeys = listTursoOrganizationKeys();
assert.deepEqual(
  facts.turso.map((account) => account.organizationEnv),
  organizationKeys.map((keys) => keys.organizationEnv),
  "Turso organizations must be the environment contract's organization keys",
);
for (const account of facts.turso) {
  assert.equal(account.organization, readEnv(account.organizationEnv), "organization names come from the environment");
  assert.deepEqual(account.usage, TURSO_USAGE_SNAPSHOT[account.organization], `${account.organization} usage must be its snapshot row`);
  for (const database of account.databases) {
    const label = database.label as LogicalDatabaseLabel;
    const urlKey = credentialKeysFor(label).split(" / ").find((key) => key.endsWith("_URL"))!;
    assert.equal(
      new URL(readEnv(urlKey)!).hostname.split(".")[0],
      `${database.cloudName}-${account.organization}`,
      `${label} must sit under the organization its configured URL names`,
    );
    assert.deepEqual(
      database.tables,
      Object.keys(DESIRED_SCHEMAS[label].tables),
      `${label} tables must be its desired-schema manifest`,
    );
    assert.deepEqual(database.readers, readersOf(label), `${label} readers must follow declared env keys`);
  }
}

// A database whose URL moves to another organization moves on the page; one
// whose URL names no organization is reported, not silently placed.
const [firstOrg, secondOrg] = facts.turso;
const movedLabel = firstOrg!.databases[0]!.label;
const movedUrlKey = credentialKeysFor(movedLabel as LogicalDatabaseLabel).split(" / ").find((key) => key.endsWith("_URL"))!;
const moved = buildCloudAccountsFacts({
  tursoInventory: inventory,
  readEnv: (key) => (key === movedUrlKey ? `libsql://moved-db-${secondOrg!.organization}.probe.turso.io` : readEnv(key)),
});
assert.ok(
  moved.turso.find((account) => account.organization === secondOrg!.organization)!.databases.some(
    (database) => database.label === movedLabel && database.cloudName === "moved-db",
  ),
  "a database must follow its configured URL to its organization",
);
const orphaned = buildCloudAccountsFacts({
  tursoInventory: inventory,
  readEnv: (key) => (key === movedUrlKey ? "libsql://orphan-unknown-org.probe.turso.io" : readEnv(key)),
});
assert.deepEqual(orphaned.tursoUnassigned, [{ label: movedLabel, urlEnv: movedUrlKey }]);

const storageAccounts = getAllStorageAccounts();
assert.deepEqual(
  facts.r2.map((account) => account.id),
  [...storageAccounts.map((account) => account.id), "ota"],
  "R2 columns must be the storage registry plus the OTA bucket",
);
for (const account of storageAccounts) {
  const row = facts.r2.find((candidate) => candidate.id === account.id)!;
  assert.deepEqual(
    [row.accountId, row.email, row.bucketName, row.publicUrl, row.envPrefix],
    [account.accountId, account.email, account.bucketName, account.publicUrl, account.envPrefix],
  );
}
const otaRow = facts.r2.find((row) => row.id === "ota")!;
assert.deepEqual(
  [otaRow.accountId, otaRow.bucketName, otaRow.publicUrl, otaRow.target],
  [OTA_R2_STORAGE_TARGET.accountId, OTA_R2_STORAGE_TARGET.bucketName, OTA_R2_STORAGE_TARGET.publicUrl, facts.otaPackage],
);

assert.deepEqual(
  facts.storageDestinations.map((destination) => [destination.source, destination.folder]),
  [
    ...getAllStorageProfiles().map((profile) => [profile.id, profile.folder]),
    [facts.otaPackage, `${getOtaPrefix()}/`],
  ],
  "destinations must be the storage profiles plus the OTA prefix",
);

// Provider identities (Vercel team slugs, token owners, Turso logins) live only
// in the generated snapshots; a hand-written copy anywhere else in the feature
// is a second, unverified source.
const featureRoot = path.join(process.cwd(), "src/features/super-admin");
const snapshotFiles = new Set(["cloud-accounts-vercel-usage-snapshot.ts", "cloud-accounts-turso-usage-snapshot.ts"]);
const identities = [
  ...facts.vercel.map((account) => account.usage.teamSlug),
  ...facts.turso.map((account) => account.usage.ownerUsername),
].filter((value): value is string => Boolean(value) && value!.length > 3);
for (const dir of ["presentation", "server/services"]) {
  for (const file of readdirSync(path.join(featureRoot, dir))) {
    if (snapshotFiles.has(file) || !/\.tsx?$/.test(file)) continue;
    const source = readFileSync(path.join(featureRoot, dir, file), "utf8");
    for (const identity of identities) {
      assert.ok(!source.includes(`"${identity}"`) && !source.includes(`'${identity}'`), `${dir}/${file} hardcodes provider identity "${identity}"`);
    }
  }
}

// ── Part 2: wording follows the facts ───────────────────────────────────────

function plain(parts: RichText): string {
  return parts
    .map((part) => (typeof part === "string" ? part : "ltr" in part ? part.ltr : "code" in part ? part.code : part.strong))
    .join("");
}

const extraAccount = { ...facts.vercel[0]!, name: "probe", project: "probe-project", servesFrontend: false };
const grown: CloudAccountsFacts = {
  ...facts,
  localEnvFile: ".env.probe",
  bridgePackage: "@probe/bridge",
  vercel: [...facts.vercel, extraAccount],
  routeGroups: [...facts.routeGroups, { owner: "probe", project: "probe-project", patterns: [] }],
};

assert.match(plain(CLOUD_ACCOUNTS_COPY.summary(facts)), new RegExp(`^${facts.vercel.length} `));
assert.match(plain(CLOUD_ACCOUNTS_COPY.summary(grown)), new RegExp(`^${facts.vercel.length + 1} `));
assert.ok(plain(CLOUD_ACCOUNTS_COPY.summary(grown)).includes(".env.probe"));
assert.ok(CLOUD_ACCOUNTS_COPY.vercel.title(grown).includes(String(facts.vercel.length + 1)));
assert.ok(plain(CLOUD_ACCOUNTS_COPY.vercel.rule(grown)).includes("@probe/bridge"));
assert.ok(cloudAccountsBridgeDiagram(grown).includes("probe-project"));
for (const group of facts.routeGroups) {
  assert.ok(cloudAccountsBridgeDiagram(facts).includes(group.project), `diagram must draw ${group.project}`);
}
const linkedProbe = { ...extraAccount, usage: { ...extraAccount.usage, status: "ok" as const, gitRepository: "probe-org/probe-repo" } };
assert.ok(plain(CLOUD_ACCOUNTS_COPY.vercel.git(linkedProbe)).includes("probe-org/probe-repo"), "the Git column must show the link Vercel reports");
assert.ok(
  !plain(CLOUD_ACCOUNTS_COPY.vercel.git({ ...linkedProbe, usage: { ...linkedProbe.usage, gitRepository: null } })).includes("probe-org"),
);
for (const account of facts.vercel) {
  if (account.usage.planLabel) assert.ok(plain(CLOUD_ACCOUNTS_COPY.vercel.snapshotNote(facts)).includes(account.usage.planLabel));
}
assert.ok(
  plain(CLOUD_ACCOUNTS_COPY.vercel.git({ ...extraAccount, gitAutoDeploy: true })) !==
    plain(CLOUD_ACCOUNTS_COPY.vercel.git({ ...extraAccount, gitAutoDeploy: false })),
  "the Git column must follow vercel.json",
);
const tursoTotal = facts.turso.reduce((sum, account) => sum + account.databases.length, 0);
assert.ok(CLOUD_ACCOUNTS_COPY.turso.title(facts).includes(String(tursoTotal)));

// ── Part 3: every tab renders every derived fact ────────────────────────────

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

const generalHtml = render(React.createElement(CloudAccountsGeneralTab, { facts }));
const vercelHtml = render(React.createElement(CloudAccountsVercelTab, { facts, liveUsage: {} }));
const tursoHtml = render(React.createElement(CloudAccountsTursoTab, { facts, liveUsage: {} }));
const cloudflareHtml = render(
  React.createElement(CloudAccountsCloudflareTab, { facts, liveUsage: {}, liveContents: {} }),
);

assert.ok(generalHtml.includes(facts.localEnvFile));
assert.ok(generalHtml.includes(facts.commands.pushVercelEnv));
for (const account of facts.vercel) {
  for (const value of [account.project, account.email, account.deployCommand!, account.usage.teamSlug ?? ""]) {
    assert.ok(vercelHtml.includes(value), `Vercel tab must render ${value}`);
  }
  for (const pattern of account.ownedRoutePatterns) assert.ok(vercelHtml.includes(pattern));
}
assert.ok(vercelHtml.includes(facts.commands.vercelUsage));
assert.ok(vercelHtml.includes(facts.routingCatalogPath));
for (const account of facts.turso) {
  assert.ok(tursoHtml.includes(account.organization));
  assert.ok(tursoHtml.includes(account.organizationEnv));
  if (account.usage.ownerEmail) assert.ok(tursoHtml.includes(account.usage.ownerEmail));
  for (const database of account.databases) {
    assert.ok(tursoHtml.includes(database.label), `Turso tab must render ${database.label}`);
    assert.ok(tursoHtml.includes(database.cloudName), `Turso tab must render ${database.cloudName}`);
    for (const table of database.tables) assert.ok(tursoHtml.includes(table), `Turso tab must render ${table}`);
    for (const reader of database.readers) assert.ok(tursoHtml.includes(reader));
  }
}
assert.ok(tursoHtml.includes(facts.commands.tursoUsage));
for (const account of facts.r2) {
  for (const value of [account.email, account.bucketName, account.target ?? "", account.envPrefix]) {
    assert.ok(cloudflareHtml.includes(value), `Cloudflare tab must render ${value}`);
  }
}
for (const destination of facts.storageDestinations) {
  assert.ok(cloudflareHtml.includes(destination.folder), `Cloudflare tab must render ${destination.folder}`);
}
assert.ok(cloudflareHtml.includes(facts.commands.r2Usage));
assert.ok(cloudflareHtml.includes(facts.commands.r2Contents));

// A live reading replaces the snapshot value on the page; a failed one keeps it.
const firstR2 = facts.r2[0]!;
const liveContentsHtml = render(
  React.createElement(CloudAccountsCloudflareTab, {
    facts,
    liveUsage: {},
    liveContents: {
      [firstR2.id]: { ...firstR2.contents, id: firstR2.id, status: "ok", latestObjectKey: "probe/live-object.webp" },
    },
  }),
);
assert.ok(liveContentsHtml.includes("probe/live-object.webp"), "live R2 contents must replace the snapshot");
const firstVercel = facts.vercel[0]!;
const liveVercelHtml = render(
  React.createElement(CloudAccountsVercelTab, {
    facts,
    liveUsage: {
      [firstVercel.name]: { ...firstVercel.usage, id: firstVercel.name, status: "apiError", message: "probe-failure" },
    },
  }),
);
assert.ok(liveVercelHtml.includes("probe-failure"), "a failed live Vercel read must be reported");

console.log(
  `cloud-accounts dynamic binding: ${facts.vercel.length} Vercel, ${facts.turso.length} Turso, ` +
    `${facts.r2.length} R2, ${facts.storageDestinations.length} destinations — every fact equals its source, ` +
    "wording follows the facts, and every tab renders them.",
);
