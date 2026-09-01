#!/usr/bin/env bash
set -euo pipefail

python3 <<'PY'
from pathlib import Path
import json


def read(path):
    return Path(path).read_text()


def write(path, text):
    Path(path).write_text(text)


def replace(path, old, new, count=1):
    text = read(path)
    actual = text.count(old)
    if actual < count:
        raise SystemExit(f"{path}: expected at least {count} occurrence(s), found {actual}: {old[:80]!r}")
    write(path, text.replace(old, new, count))


# 1. CORS is exact-origin only.
replace(
    "src/proxy.ts",
    "  return allowed.some((entry) => entry === origin || origin.startsWith(entry));",
    "  return allowed.includes(origin);",
)

compat = read("src/core/api/tests/compatibility-boundary.test.ts")
needle = '''  assert.match(response.headers.get("access-control-allow-headers") ?? "", /X-Asol-Session-Token/);
}

/** A preflight for a path gova still owns is not intercepted. */'''
insert = '''  assert.match(response.headers.get("access-control-allow-headers") ?? "", /X-Asol-Session-Token/);
}

/** An allowed origin is exact. A hostile suffix must never inherit trust. */
{
  const response = proxy(
    new NextRequest("https://gova.example/api/products", {
      method: "OPTIONS",
      headers: { origin: "https://app.example.evil.tld" },
    }),
  );
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
}

/** A preflight for a path gova still owns is not intercepted. */'''
if needle not in compat:
    raise SystemExit("compatibility-boundary insertion point not found")
write("src/core/api/tests/compatibility-boundary.test.ts", compat.replace(needle, insert, 1))

# 2. Direct-agent scripts consume the declared OTA publishing door.
replace(
    "scripts/local-agent-device-discovery.ts",
    '''import {
  createOtaR2Client,
  putOtaObject,
} from "../packages/ota-core/src/publishing/adapters/r2-storage.adapter";
import {
  getOtaPublicBaseUrl,
  loadOtaEnvironment,
} from "../packages/ota-core/src/publishing/config/ota-config";''',
    '''import {
  createOtaR2Client,
  getOtaPublicBaseUrl,
  loadOtaEnvironment,
  putOtaObject,
} from "@asol/ota-core/publishing";''',
)

replace(
    "scripts/local-agent-direct-daemon.ts",
    '''import {
  createOtaR2Client,
  deleteOtaObject,
  getOtaObjectBytes,
  listOtaObjectKeys,
  putOtaObject,
} from "../packages/ota-core/src/publishing/adapters/r2-storage.adapter";
import { loadOtaEnvironment } from "../packages/ota-core/src/publishing/config/ota-config";''',
    '''import {
  createOtaR2Client,
  deleteOtaObject,
  getOtaObjectBytes,
  listOtaObjectKeys,
  loadOtaEnvironment,
  putOtaObject,
} from "@asol/ota-core/publishing";''',
)

daemon = read("scripts/local-agent-direct-daemon.ts")
needle = '''function persist(): void { writeDirectDaemonState(state()); }

async function runDiscoveryRefresh(): Promise<void> {'''
insert = '''function persist(): void { writeDirectDaemonState(state()); }

async function deleteRendezvousObject(key: string, reason: string): Promise<void> {
  try {
    await deleteOtaObject(r2, key);
  } catch (error) {
    console.error(JSON.stringify({
      event: "direct-webrtc-r2-cleanup-failed",
      reason,
      error: error instanceof Error ? error.message : String(error),
    }));
  }
}

async function runDiscoveryRefresh(): Promise<void> {'''
if needle not in daemon:
    raise SystemExit("daemon helper insertion point not found")
daemon = daemon.replace(needle, insert, 1)
daemon = daemon.replace(
    "catch { await deleteOtaObject(r2, key).catch(()=>undefined); continue; }",
    'catch { await deleteRendezvousObject(key, "malformed-offer"); continue; }',
    1,
)
daemon = daemon.replace(
    "if (!doc || doc.schemaVersion !== 1 || doc.hostId !== hostId || !rendezvousDocumentIsFresh(doc)) { await deleteOtaObject(r2, key).catch(()=>undefined); continue; }",
    'if (!doc || doc.schemaVersion !== 1 || doc.hostId !== hostId || !rendezvousDocumentIsFresh(doc)) { await deleteRendezvousObject(key, "invalid-offer"); continue; }',
    1,
)
daemon = daemon.replace(
    'await deleteOtaObject(r2, key).catch(()=>undefined);\n        console.error(JSON.stringify({event:"direct-webrtc-offer-rejected"',
    'await deleteRendezvousObject(key, "rejected-offer");\n        console.error(JSON.stringify({event:"direct-webrtc-offer-rejected"',
    1,
)
write("scripts/local-agent-direct-daemon.ts", daemon)

replace(
    "scripts/local-agent-direct-remote.ts",
    '''import {
  createOtaR2Client,
  deleteOtaObject,
  getOtaObjectBytes,
  putOtaObject,
} from "../packages/ota-core/src/publishing/adapters/r2-storage.adapter";
import {
  getOtaPublicBaseUrl,
  loadOtaEnvironment,
} from "../packages/ota-core/src/publishing/config/ota-config";''',
    '''import {
  createOtaR2Client,
  deleteOtaObject,
  getOtaObjectBytes,
  getOtaPublicBaseUrl,
  loadOtaEnvironment,
  putOtaObject,
} from "@asol/ota-core/publishing";''',
)
remote = read("scripts/local-agent-direct-remote.ts")
needle = '''function safeHostKey(){ return `host-discovery/${normalizedLocalHost()}.json`; }

async function discover(): Promise<Discovery> {'''
insert = '''function safeHostKey(){ return `host-discovery/${normalizedLocalHost()}.json`; }
function directErrorMessage(error: unknown): string { return error instanceof Error ? error.message : String(error); }
async function deleteRemoteRendezvousObject(r2: ReturnType<typeof createOtaR2Client>, key: string, reason: string): Promise<void> {
  try { await deleteOtaObject(r2, key); }
  catch (error) { console.error(JSON.stringify({event:"direct-webrtc-r2-cleanup-failed",reason,error:directErrorMessage(error)})); }
}

async function discover(): Promise<Discovery> {'''
if needle not in remote:
    raise SystemExit("remote helper insertion point not found")
remote = remote.replace(needle, insert, 1)
remote = remote.replace(
    "await deleteOtaObject(r2,offerKey).catch(()=>undefined); await deleteOtaObject(r2,answerKey).catch(()=>undefined);",
    'await deleteRemoteRendezvousObject(r2,offerKey,"offer"); await deleteRemoteRendezvousObject(r2,answerKey,"answer");',
    1,
)
remote = remote.replace(
    "  } finally { await session.client.close().catch(()=>undefined); await session.tunnel?.close().catch(()=>undefined); }",
    '''  } finally {
    try { await session.client.close(); }
    catch (error) { console.error(JSON.stringify({event:"direct-client-close-failed",error:directErrorMessage(error)})); }
    if (session.tunnel) {
      try { await session.tunnel.close(); }
      catch (error) { console.error(JSON.stringify({event:"direct-tunnel-close-failed",error:directErrorMessage(error)})); }
    }
  }''',
    1,
)
write("scripts/local-agent-direct-remote.ts", remote)

# 3. Gateway processes only request documents changed by this push.
gateway = read("scripts/local-agent-gateway.ts")
gateway = gateway.replace(
    '''import {
  declareAgent,''',
    '''import { existsSync, readFileSync } from "node:fs";

import {
  declareAgent,''',
    1,
)
needle = '''function candidateRequestId(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== "object") return null;
  const value = (parsed as { requestId?: unknown }).requestId;
  return typeof value === "string" ? value : null;
}

async function main(): Promise<void> {'''
insert = '''function candidateRequestId(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== "object") return null;
  const value = (parsed as { requestId?: unknown }).requestId;
  return typeof value === "string" ? value : null;
}

interface RequestSnapshot {
  sourceRef: string;
  files: string[];
}

function pushedRequestSnapshot(root: string): RequestSnapshot | null {
  const eventPath = process.env.GITHUB_EVENT_PATH?.trim();
  if (!eventPath || !existsSync(eventPath)) return null;
  try {
    const event = JSON.parse(readFileSync(eventPath, "utf8")) as { before?: unknown; after?: unknown };
    const after = typeof event.after === "string" ? event.after.trim() : "";
    if (!/^[0-9a-f]{40}$/i.test(after) || /^0{40}$/.test(after)) return null;
    const currentFiles = new Set(
      gitSoft(["ls-tree", "-r", "--name-only", after, "--", REQUEST_DIRECTORY], root)
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.endsWith(".json")),
    );
    const before = typeof event.before === "string" ? event.before.trim() : "";
    const beforeExists = /^[0-9a-f]{40}$/i.test(before) && !/^0{40}$/.test(before) &&
      gitSoft(["cat-file", "-t", before], root).trim() === "commit";
    const changed = beforeExists
      ? gitSoft(["diff", "--name-only", before, after, "--", REQUEST_DIRECTORY], root)
          .split("\n").map((line) => line.trim()).filter(Boolean)
      : [...currentFiles];
    return {
      sourceRef: after,
      files: changed.filter((file) => file.endsWith(".json") && currentFiles.has(file)),
    };
  } catch (error) {
    console.error(`Unable to scope gateway request files to this push: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

async function main(): Promise<void> {'''
if needle not in gateway:
    raise SystemExit("gateway insertion point not found")
gateway = gateway.replace(needle, insert, 1)
old = '''    const files = gitSoft(["ls-tree", "-r", "--name-only", ref, "--", REQUEST_DIRECTORY], root)
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.endsWith(".json"));

    if (files.length === 0) {'''
new = '''    const pushSnapshot = pushedRequestSnapshot(root);
    const sourceRef = pushSnapshot?.sourceRef ?? ref;
    const files = pushSnapshot?.files ?? gitSoft(["ls-tree", "-r", "--name-only", ref, "--", REQUEST_DIRECTORY], root)
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.endsWith(".json"));

    if (files.length === 0) {'''
if old not in gateway:
    raise SystemExit("gateway file selection block not found")
gateway = gateway.replace(old, new, 1)
gateway = gateway.replace(
    'const raw = gitSoft(["show", `${ref}:${file}`], root);',
    'const raw = gitSoft(["show", `${sourceRef}:${file}`], root);',
    1,
)
write("scripts/local-agent-gateway.ts", gateway)

workflow = read(".github/workflows/local-agent-gateway.yml")
workflow = workflow.replace(
    "#   cloud agent -> git push agent-request/* -> this job -> workflow_dispatch -> local runner",
    "#   cloud agent -> git push agent-request/chatgpt -> this job -> workflow_dispatch -> local runner",
    1,
)
workflow = workflow.replace(
    "# request branch is deleted once processed. Nothing here lands on main, so\n# coordination traffic never reaches the branch whose pushes deploy production.",
    "# permanent request branch is retained. Request ids are single-use, and this job\n# evaluates only request documents changed by the current push, so old malformed or\n# rejected history cannot poison future dispatches. Nothing here lands on main.",
    1,
)
workflow = workflow.replace('      - "agent-request/**"', '      - "agent-request/chatgpt"', 1)
write(".github/workflows/local-agent-gateway.yml", workflow)

policy = read("scripts/github-ci-policy.ts")
old = '''  if (!/^ {2}push:\\s*$/m.test(body) || !body.includes('- "agent-request/**"')) {
    errors.push("Dispatch gateway workflow must trigger on push to agent-request/** branches only.");
  }'''
new = '''  if (!/^ {2}push:\\s*$/m.test(body) || !body.includes('- "agent-request/chatgpt"')) {
    errors.push("Dispatch gateway workflow must trigger on push to the permanent agent-request/chatgpt branch only.");
  }
  if (body.includes('agent-request/**')) {
    errors.push("Dispatch gateway workflow must not accept wildcard request branches.");
  }'''
if old not in policy:
    raise SystemExit("gateway CI policy block not found")
write("scripts/github-ci-policy.ts", policy.replace(old, new, 1))
replace(
    "scripts/tests/local-agent-control-plane.test.ts",
    '''assert.match(
  localAgentGatewayWorkflowViolations(workflow("local-agent-gateway.yml").replace('- "agent-request/**"', "- main")).join(" "),''',
    '''assert.match(
  localAgentGatewayWorkflowViolations(workflow("local-agent-gateway.yml").replace('- "agent-request/chatgpt"', "- main")).join(" "),''',
)

# 4. Vercel env ownership: one API owner, gova public-only sync, fail closed on business secrets.
core = read("packages/vercel-deploy-core/src/index.ts")
needle = '''export async function upsertEnv(
  token: string,'''
insert = '''export async function deleteProjectEnv(
  token: string,
  projectId: string,
  envId: string,
  teamId?: string,
): Promise<boolean> {
  const response = await fetch(
    withTeam(`https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}/env/${encodeURIComponent(envId)}`, teamId),
    { method: 'DELETE', headers: buildHeaders(token) },
  );
  if (response.status === 404) return false;
  if (!response.ok) {
    throw new Error(`Failed to delete project environment entry ${envId}: ${response.status} ${await response.text()}`);
  }
  return true;
}

export async function upsertEnv(
  token: string,'''
if needle not in core:
    raise SystemExit("vercel core insertion point not found")
write("packages/vercel-deploy-core/src/index.ts", core.replace(needle, insert, 1))

write(
    "scripts/push-vercel-turso-env.ts",
    '''import { existsSync } from "node:fs";
import dotenv from "dotenv";
import { GOVA_DECLARATION } from "@asol/account-declarations/gova";
import {
  deleteProjectEnv,
  findProject,
  listProjectEnv,
  writeProjectEnv,
} from "@asol/vercel-deploy-core";

if (existsSync(".env.local")) dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

function requireToken(): string {
  const token = process.env.VERCEL_TOKEN || process.env.VERCEL_ACCESS_TOKEN;
  if (!token) throw new Error("VERCEL_TOKEN or VERCEL_ACCESS_TOKEN is required locally.");
  return token;
}

function teamScope(): string | undefined {
  return process.env.VERCEL_ORG_ID || process.env.VERCEL_TEAM_ID || undefined;
}

async function resolveProjectId(token: string, teamId?: string): Promise<string> {
  const fromEnv = process.env.VERCEL_PROJECT_ID?.trim();
  if (fromEnv) return fromEnv;
  const projectName = process.env.VERCEL_PROJECT_NAME?.trim() || GOVA_DECLARATION.project;
  const projectId = await findProject(token, projectName, teamId);
  if (!projectId) throw new Error(`Vercel project "${projectName}" not found.`);
  return projectId;
}

async function main(): Promise<void> {
  const required = [...GOVA_DECLARATION.requiredEnv];
  const optional = [...GOVA_DECLARATION.optionalEnv];
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing local public gova values for: ${missing.join(", ")}. Deploy/resolve every owner runtime first.`);
  }

  const allowed = new Set<string>([...required, ...optional]);
  const token = requireToken();
  const teamId = teamScope();
  const projectId = await resolveProjectId(token, teamId);
  const existing = await listProjectEnv(token, projectId, teamId);

  console.log(`Vercel gova project: ${projectId}`);
  for (const item of existing) {
    if (allowed.has(item.key)) continue;
    await deleteProjectEnv(token, projectId, item.id, teamId);
    console.log(`removed undeclared gova env: ${item.key}`);
  }

  const refreshed = await listProjectEnv(token, projectId, teamId);
  for (const key of required) {
    const result = await writeProjectEnv(token, projectId, key, process.env[key]!.trim(), refreshed, teamId);
    console.log(`${key}: ${result}`);
  }
  for (const key of optional) {
    const value = process.env[key]?.trim();
    if (!value) continue;
    const result = await writeProjectEnv(token, projectId, key, value, refreshed, teamId);
    console.log(`${key}: ${result}`);
  }

  console.log("gova frontend environment synchronized: public routing/config only; undeclared business secrets removed.");
}

main().catch((error) => {
  console.error("Failed to synchronize gova frontend environment:", error instanceof Error ? error.message : error);
  process.exit(1);
});
''',
)

pkg = json.loads(read("package.json"))
scripts = pkg["scripts"]
scripts["gova:env:sync"] = "npx tsx scripts/push-vercel-turso-env.ts"
scripts["db:push:vercel-env"] = "npm run gova:env:sync"
write("package.json", json.dumps(pkg, ensure_ascii=False, indent=2) + "\n")

build = read("scripts/vercel-deployment-build.ts")
old = '''  const foreign = foreignRuntimeEnvNames(runtime);
  if (foreign.length > 0) {
    console.warn(
      `[vercel-build] "${runtime}" holds ${foreign.length} undeclared secret name(s): ` +
        foreign.map((finding) => `${finding.name} (${finding.family})`).join(", "),
    );
  }'''
new = '''  const foreign = foreignRuntimeEnvNames(runtime);
  const foreignBusinessSecrets = foreign.filter((finding) => finding.family !== "deployment credential");
  if (runtime === "gova" && foreignBusinessSecrets.length > 0) {
    throw new Error(
      `[vercel-build] gova is frontend-only but holds undeclared business secret name(s): ` +
        foreignBusinessSecrets.map((finding) => `${finding.name} (${finding.family})`).join(", "),
    );
  }
  if (foreign.length > 0) {
    console.warn(
      `[vercel-build] "${runtime}" holds ${foreign.length} undeclared secret name(s): ` +
        foreign.map((finding) => `${finding.name} (${finding.family})`).join(", "),
    );
  }'''
if old not in build:
    raise SystemExit("vercel build foreign env block not found")
write("scripts/vercel-deployment-build.ts", build.replace(old, new, 1))

vt = read("scripts/tests/vercel-deployment-guards.test.ts")
needle = 'const deployWorkflowSource = read(".github/workflows/deploy-main.yml");\n'
if needle not in vt:
    raise SystemExit("vercel guard test source insertion missing")
vt = vt.replace(
    needle,
    needle + 'const govaEnvSyncSource = read("scripts/push-vercel-turso-env.ts");\n',
    1,
)
needle = '''assert.deepEqual(foreignRuntimeEnvNames("gova", filled), []);

assert.equal(assertVercelHostEnvironment'''
insert = '''assert.deepEqual(foreignRuntimeEnvNames("gova", filled), []);

assert.match(buildSource, /foreignBusinessSecrets/);
assert.match(buildSource, /gova is frontend-only but holds undeclared business secret name/);
assert.match(govaEnvSyncSource, /GOVA_DECLARATION/);
assert.match(govaEnvSyncSource, /deleteProjectEnv/);
for (const forbidden of ["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN", "R2_SECRET_ACCESS_KEY", "ASOL_SESSION_SIGNING_SECRET"]) {
  assert.equal(govaEnvSyncSource.includes(forbidden), false, `gova env sync must never push ${forbidden}`);
}
assert.equal(pkg.scripts?.["gova:env:sync"], "npx tsx scripts/push-vercel-turso-env.ts");
assert.equal(pkg.scripts?.["db:push:vercel-env"], "npm run gova:env:sync");

assert.equal(assertVercelHostEnvironment'''
if needle not in vt:
    raise SystemExit("vercel guard test contract insertion missing")
write("scripts/tests/vercel-deployment-guards.test.ts", vt.replace(needle, insert, 1))

coretest = read("packages/vercel-deploy-core/src/tests/index.test.ts")
coretest = coretest.replace(
    "  deployAccountService,\n} from '../index';",
    "  deployAccountService,\n  deleteProjectEnv,\n} from '../index';",
    1,
)
coretest = coretest.replace(
    "  assert(typeof ensureProject === 'function', 'D8: Module exported functions without executing main');",
    "  assert(typeof ensureProject === 'function', 'D8: Module exported functions without executing main');\n  assert(typeof deleteProjectEnv === 'function', 'D9: project environment deletion stays in vercel-deploy-core');",
    1,
)
write("packages/vercel-deploy-core/src/tests/index.test.ts", coretest)

# 5. Documentation.
sec = read("docs/01-architecture/10-application-layers/security-rules.md")
sec = sec.replace(
    "When `ASOL_CORS_ORIGINS` is unset, dev defaults include localhost and Capacitor shell origins (`capacitor://localhost`, etc.).",
    "`ASOL_CORS_ORIGINS` entries are exact origins. Trust never extends by string prefix to a subdomain or hostile suffix; `https://app.example` does not authorize `https://app.example.evil.tld`. `*` is accepted only when it is explicitly configured.\n\nWhen `ASOL_CORS_ORIGINS` is unset, no origin is reflected by the gova compatibility boundary.",
    1,
)
write("docs/01-architecture/10-application-layers/security-rules.md", sec)

runner = read("docs/07-mobile-and-release/local-agent-runner-pool.md")
old = "The permanent branch is never deleted after processing. Request IDs are recorded in machine-local coordination state and are single-use, so retained request files cannot execute twice. Requests must target `main`, must be fresh enough for the contract, and are rejected if their values look like secret material."
new = "The permanent branch is never deleted after processing. Request IDs are recorded in machine-local coordination state and are single-use, so retained request files cannot execute twice. On a GitHub push the gateway evaluates only request documents added or changed by that push; old malformed or rejected history therefore cannot make a later valid dispatch fail. Requests must target `main`, must be fresh enough for the contract, and are rejected if their values look like secret material."
if old not in runner:
    raise SystemExit("runner docs gateway paragraph not found")
write("docs/07-mobile-and-release/local-agent-runner-pool.md", runner.replace(old, new, 1))

ops = read("docs/07-mobile-and-release/scripts-and-workflows.md")
ops = ops.replace(
    "npm run db:push:vercel-env      # Turso + bridge URLs + ASOL_MOBILE_PUSH_* when provisioned",
    "npm run gova:env:sync           # gova public owner origins/config only; removes undeclared business secrets",
    1,
)
ops = ops.replace(
    "npm run db:provision:turso\nnpm run db:push:vercel-env\n# Redeploy Vercel",
    "npm run db:provision:turso\n# Service deploy commands own their service credentials. After owner URLs exist:\nnpm run gova:env:sync\n# Redeploy Vercel",
    1,
)
anchor = "The repository-root `.vercelignore` excludes native build trees and generated\nartifacts from the hosted source upload."
para = "`npm run gova:env:sync` is the only supported environment synchronizer for the GitHub-linked gova project. It writes only the public frontend keys declared by `GOVA_DECLARATION` and deletes undeclared project environment entries, so Turso, R2, signing, push-provider, mail, and publishing credentials cannot remain attached to the frontend. The legacy `db:push:vercel-env` command is retained only as an alias to this safe operation; it no longer pushes database credentials. Dedicated service deployments provision their own declared environment instead.\n\n"
if anchor not in ops:
    raise SystemExit("scripts docs env paragraph anchor missing")
write("docs/07-mobile-and-release/scripts-and-workflows.md", ops.replace(anchor, para + anchor, 1))
PY

npm run docs:generate
npm run typecheck
npm run lint
npx tsx scripts/validate-error-logging.ts
npm run github:ci-policy
npm run architecture:check
npm run docs:ci
npm run test:api-core
npm run test:local-agent-core
npm run test:local-agent-workflows
npm run test:vercel-deploy-core
npm run test:deployment-tools
npm run control:verify
npm run control:build
npm run control:smoke
npm run verify:all
npm run test

# Test again after generated service mirrors and test-time syncs have run.
npm run docs:generate
npm run docs:ci
npm run architecture:check

rm -rf .tmp-gova-build
npm run gova:tree
(
  cd .tmp-gova-build
  ASOL_RUNTIME_ROLE=gova-frontend node ../node_modules/next/dist/bin/next build
)
./node_modules/.bin/tsx -e "import { assertGovaArtifact } from '@asol/gova-deployment-core'; const r=assertGovaArtifact('.tmp-gova-build'); console.log('GOVA_ARTIFACT_API_FUNCTIONS='+r.apiFunctions.join(',')); if (r.apiFunctions.some((x)=>x !== 'health')) process.exit(72);"
ASOL_CORS_ORIGINS='https://trusted.example' ./node_modules/.bin/tsx -e "import { NextRequest } from 'next/server'; import { proxy } from './src/proxy'; const req=new NextRequest('https://gova.example/api/products',{method:'OPTIONS',headers:{origin:'https://trusted.example.evil.tld','access-control-request-method':'GET'}}); const res=proxy(req); const reflected=res.headers.get('access-control-allow-origin'); console.log('SPOOF_REFLECTED='+String(reflected)); if (reflected) process.exit(73);"
rm -rf .tmp-gova-build

git status --short
echo FIX_ALL_CODE_GATES=PASS
