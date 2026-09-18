import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { CLOUD_ACCOUNTS_COPY } from "../presentation/cloud-accounts-copy";
import {
  CLOUD_ACCOUNTS_LIVE_SOURCES,
  type CloudAccountsTab,
} from "../presentation/use-cloud-accounts-live-usage";

/**
 * `/dev/cloud-accounts` must be current on every page load and every tab open.
 *
 * Page load: the route is force-dynamic and derives the facts inside the request,
 * so no build-time or module-level copy can be served. Tab open: every provider
 * tab names live reads for every provider value it shows, each backed by a
 * strict development-only, super-admin-only route, re-issued on every activation
 * and bypassing every cache.
 */

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), "utf8");

// ── Page load ───────────────────────────────────────────────────────────────

const pageSource = read("src/app/dev/cloud-accounts/page.tsx");
assert.match(pageSource, /export const dynamic = "force-dynamic";/, "the route must render per request");
assert.match(
  pageSource,
  /export default function DevCloudAccountsRoute\(\)\s*\{[\s\S]*const facts = buildCloudAccountsFacts\(\{[\s\S]*readTursoDatabaseInventory\(\)[\s\S]*readEnv: readOptionalEnv[\s\S]*facts=\{facts\}/,
  "facts must be derived inside the request, not at module load",
);
assert.doesNotMatch(
  pageSource,
  /^const\s+\w+\s*=\s*(?:buildCloudAccountsFacts|readTursoDatabaseInventory)\(/m,
  "a module-level facts constant would freeze the page at first load",
);
assert.match(pageSource, /isDevelopment\) notFound\(\)/, "the route must stay development-only");

const factsSource = read("src/features/super-admin/server/services/cloud-accounts-facts.ts");
assert.match(
  factsSource,
  /export function buildCloudAccountsFacts\([^)]*\)[^{]*\{[\s\S]*readPackageScripts\(\)/,
  "package.json must be re-read on every build of the facts",
);
const repositorySource = read("src/features/super-admin/server/services/cloud-accounts-repository-facts.ts");
assert.doesNotMatch(repositorySource, /^let\s|cache/im, "repository facts must not be memoized across requests");

// ── Tab open ────────────────────────────────────────────────────────────────

const tabs = Object.keys(CLOUD_ACCOUNTS_COPY.tabs) as CloudAccountsTab[];
assert.deepEqual(
  [...tabs].sort(),
  Object.keys(CLOUD_ACCOUNTS_LIVE_SOURCES).sort(),
  "every rendered tab must declare its live reads (an empty list only for derived-only tabs)",
);
assert.deepEqual(CLOUD_ACCOUNTS_LIVE_SOURCES.general, [], "the general tab shows derived facts only");

const expectedSources: Record<Exclude<CloudAccountsTab, "general">, readonly string[]> = {
  vercel: ["vercel"],
  turso: ["turso"],
  cloudflare: ["r2Usage", "r2Contents"],
};
for (const [tab, sources] of Object.entries(expectedSources)) {
  assert.deepEqual(
    CLOUD_ACCOUNTS_LIVE_SOURCES[tab as CloudAccountsTab].map((entry) => entry.source),
    sources,
    `the ${tab} tab must refresh every provider value it shows`,
  );
}

const liveServices: Record<string, string> = {
  "vercel-usage": "readLiveCloudAccountsVercelUsage",
  "turso-usage": "readLiveCloudAccountsTursoUsage",
  "r2-usage": "readLiveCloudAccountsR2Usage",
  "r2-contents": "readLiveCloudAccountsR2Contents",
};
for (const { path: apiPath } of Object.values(CLOUD_ACCOUNTS_LIVE_SOURCES).flat()) {
  const segment = apiPath.replace("/api/dev/cloud-accounts/", "");
  const routeFile = `src/app/api/dev/cloud-accounts/${segment}/route.ts`;
  assert.ok(existsSync(path.join(root, routeFile)), `${apiPath} must have a route handler`);
  const routeSource = read(routeFile);
  assert.match(routeSource, /assertDevelopmentToolingAllowed\([^)]*strict:\s*true/s, `${routeFile} must be development-only`);
  assert.match(routeSource, /assertSuperAdminRequest\(request\)/, `${routeFile} must require a super admin`);
  assert.ok(liveServices[segment], `${apiPath} must map to a known live service`);
  assert.match(routeSource, new RegExp(`${liveServices[segment]}\\(\\)`), `${routeFile} must read live data`);
}

const hookSource = read("src/features/super-admin/presentation/use-cloud-accounts-live-usage.ts");
assert.match(
  hookSource,
  /CLOUD_ACCOUNTS_LIVE_SOURCES\[activeTab\]/,
  "the hook must issue the reads the active tab declares",
);
assert.match(
  hookSource,
  /\}, \[activeTab, sessionToken\]\);/,
  "the reads must re-run on every tab activation",
);
assert.match(hookSource, /cache:\s*"no-store"/);
assert.match(hookSource, /localReadPolicy:\s*"networkAuthoritative"/);
assert.match(hookSource, /return \(\) => controller\.abort\(\);/, "leaving a tab must cancel its reads");

const contentSource = read("src/features/super-admin/presentation/SuperAdminCloudAccountsContent.tsx");
assert.match(contentSource, /useCloudAccountsLiveUsage\(activeTab, session\?\.sessionToken\)/);
for (const [tab, prop] of [
  ["CloudAccountsVercelTab", "live.vercel"],
  ["CloudAccountsTursoTab", "live.turso"],
  ["CloudAccountsCloudflareTab", "live.r2Usage"],
  ["CloudAccountsCloudflareTab", "live.r2Contents"],
] as const) {
  assert.match(contentSource, new RegExp(`<${tab}[\\s\\S]*?${prop.replace(".", "\\.")}`), `${tab} must receive ${prop}`);
}

// Opening a tab re-reads each account's identity too, not only its usage.
const vercelReader = read("src/features/super-admin/server/services/cloud-accounts-vercel-usage.ts");
assert.match(vercelReader, /resolveTeamSummary\(token\)/, "the Vercel read must ask Vercel for the team slug and plan");
assert.match(vercelReader, /readProjectGitRepository\(/, "the Vercel read must ask Vercel for the project Git link");
assert.match(vercelReader, /ownerEmail/, "the Vercel read must report the token owner");
const tursoReader = read("src/features/super-admin/server/services/cloud-accounts-turso-usage.ts");
assert.match(tursoReader, /readTursoOrganizationIdentity\(/, "the Turso read must ask Turso for owner and databases");
for (const script of ["scripts/update-cloud-accounts-vercel-usage.ts", "scripts/update-cloud-accounts-turso-usage.ts"]) {
  assert.match(read(script), /readVercelAccountUsage|readTursoOrganizationRow/, `${script} must use the live reader`);
}

// Live rows are keyed by the same ids the facts use, or they would never match.
const vercelLive = read("src/features/super-admin/server/services/cloud-accounts-vercel-usage.server.ts");
assert.match(vercelLive, /id: declaration\.name/);
assert.match(read("src/features/super-admin/presentation/CloudAccountsTursoTab.tsx"), /liveUsage\[account\.organization\]/);
assert.match(tursoReader, /const id = organization \|\| keys\.organizationEnv;/);
const r2Live = read("src/features/super-admin/server/services/cloud-accounts-r2-live-accounts.server.ts");
assert.match(r2Live, /getAllStorageAccounts\(\)/);
assert.match(r2Live, /OTA_R2_CLOUD_ACCOUNT\.id/);

// ── Release gate ────────────────────────────────────────────────────────────
// `deploy:all` preflight runs `npm run test`, the generated test gate. Every
// cloud-accounts suite must stay reachable from it, or a release could ship a
// page whose bindings nothing checked.

const scripts = (JSON.parse(read("package.json")) as { scripts: Record<string, string> }).scripts;
for (const suite of [
  "cloud-accounts-emails.test.ts",
  "cloud-accounts-dynamic-binding.test.ts",
  "cloud-accounts-live-refresh.test.ts",
  "cloud-accounts-gova-boundary.test.ts",
]) {
  assert.ok(
    scripts["test:cloud-accounts"]?.includes(`src/features/super-admin/tests/${suite}`),
    `test:cloud-accounts must run ${suite}`,
  );
}
assert.match(
  read("scripts/generated-gates.ts"),
  /\{ kind: 'script', name: 'test:cloud-accounts' \}/,
  "the generated test gate (npm run test, run by deploy:all) must include test:cloud-accounts",
);
assert.match(
  read("packages/release-core/src/console/deploy-all-runbook.ts"),
  /branch\("tests", "full test suite", "test", "npm"\)/,
  "deploy:all preflight must run the full test suite",
);

console.log(
  "cloud-accounts live refresh: facts are derived per request; " +
    `${Object.values(CLOUD_ACCOUNTS_LIVE_SOURCES).flat().length} live reads re-run on every tab activation.`,
);
