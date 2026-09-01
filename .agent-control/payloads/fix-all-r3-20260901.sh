#!/usr/bin/env bash
set -euo pipefail

# Reuse the first payload for the already-proven CORS, OTA-door, and error-logging
# edits. It intentionally stops at the old brittle gateway replacement; those
# earlier writes remain in this isolated worktree and the robust continuation
# below completes the operation.
git fetch origin agent-request/chatgpt
git show FETCH_HEAD:.agent-control/payloads/fix-all-20260901.sh > /tmp/gova-fix-all-base.sh
set +e
bash /tmp/gova-fix-all-base.sh
base_rc=$?
set -e
echo "BASE_PAYLOAD_RC=$base_rc"

grep -Fq 'return allowed.includes(origin);' src/proxy.ts
grep -Fq 'from "@asol/ota-core/publishing";' scripts/local-agent-device-discovery.ts
grep -Fq 'from "@asol/ota-core/publishing";' scripts/local-agent-direct-daemon.ts
grep -Fq 'from "@asol/ota-core/publishing";' scripts/local-agent-direct-remote.ts

python3 <<'PY'
from pathlib import Path
import json


def read(path: str) -> str:
    return Path(path).read_text()


def write(path: str, text: str) -> None:
    Path(path).write_text(text)


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    if old not in text:
        raise SystemExit(f"{path}: replacement anchor missing: {old[:100]!r}")
    write(path, text.replace(old, new, 1))


# ── Gateway: evaluate only JSON request documents changed by this push ───────
gateway_path = "scripts/local-agent-gateway.ts"
gateway = read(gateway_path)
if 'from "node:fs"' not in gateway:
    gateway = gateway.replace(
        "import {\n  declareAgent,",
        'import { existsSync, readFileSync } from "node:fs";\n\nimport {\n  declareAgent,',
        1,
    )

helper_anchor = '''function candidateRequestId(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== "object") return null;
  const value = (parsed as { requestId?: unknown }).requestId;
  return typeof value === "string" ? value : null;
}
'''
helper = helper_anchor + '''
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
        .split("\\n")
        .map((line) => line.trim())
        .filter((line) => line.endsWith(".json")),
    );
    const before = typeof event.before === "string" ? event.before.trim() : "";
    const beforeExists =
      /^[0-9a-f]{40}$/i.test(before) &&
      !/^0{40}$/.test(before) &&
      gitSoft(["cat-file", "-t", before], root).trim() === "commit";
    const changed = beforeExists
      ? gitSoft(["diff", "--name-only", before, after, "--", REQUEST_DIRECTORY], root)
          .split("\\n")
          .map((line) => line.trim())
          .filter(Boolean)
      : [...currentFiles];
    return {
      sourceRef: after,
      files: changed.filter((file) => file.endsWith(".json") && currentFiles.has(file)),
    };
  } catch (error) {
    console.error(
      `Unable to scope gateway request files to this push: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}
'''
if "function pushedRequestSnapshot" not in gateway:
    if helper_anchor not in gateway:
        raise SystemExit("gateway helper anchor missing")
    gateway = gateway.replace(helper_anchor, helper, 1)

start_marker = '    const files = gitSoft(["ls-tree", "-r", "--name-only", ref, "--", REQUEST_DIRECTORY], root)'
end_marker = '    if (files.length === 0) {'
start = gateway.find(start_marker)
end = gateway.find(end_marker, start if start >= 0 else 0)
if start < 0 or end < 0:
    raise SystemExit(f"gateway structural slice not found: start={start} end={end}")
new_selection = '''    const pushSnapshot = pushedRequestSnapshot(root);
    const sourceRef = pushSnapshot?.sourceRef ?? ref;
    const files = pushSnapshot?.files ?? gitSoft(["ls-tree", "-r", "--name-only", ref, "--", REQUEST_DIRECTORY], root)
      .split("\\n")
      .map((line) => line.trim())
      .filter((line) => line.endsWith(".json"));

'''
gateway = gateway[:start] + new_selection + gateway[end:]
gateway = gateway.replace(
    'const raw = gitSoft(["show", `${ref}:${file}`], root);',
    'const raw = gitSoft(["show", `${sourceRef}:${file}`], root);',
    1,
)
write(gateway_path, gateway)

workflow_path = ".github/workflows/local-agent-gateway.yml"
workflow = read(workflow_path)
workflow = workflow.replace("agent-request/*", "agent-request/chatgpt")
workflow = workflow.replace('      - "agent-request/**"', '      - "agent-request/chatgpt"', 1)
workflow = workflow.replace(
    "# request branch is deleted once processed. Nothing here lands on main, so\n# coordination traffic never reaches the branch whose pushes deploy production.",
    "# permanent request branch is retained. Request ids are single-use, and this job\n# evaluates only request documents changed by the current push, so old malformed or\n# rejected history cannot poison future dispatches. Nothing here lands on main.",
    1,
)
write(workflow_path, workflow)

policy_path = "scripts/github-ci-policy.ts"
policy = read(policy_path)
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
    raise SystemExit("gateway CI policy block missing")
write(policy_path, policy.replace(old, new, 1))

control_test_path = "scripts/tests/local-agent-control-plane.test.ts"
control_test = read(control_test_path)
control_test = control_test.replace(
    'workflow("local-agent-gateway.yml").replace(\'- "agent-request/**"\', "- main")',
    'workflow("local-agent-gateway.yml").replace(\'- "agent-request/chatgpt"\', "- main")',
    1,
)
write(control_test_path, control_test)

# ── Vercel environment ownership ─────────────────────────────────────────────
core_path = "packages/vercel-deploy-core/src/index.ts"
core = read(core_path)
if "export async function deleteProjectEnv(" not in core:
    marker = "export async function upsertEnv(\n  token: string,"
    if marker not in core:
        raise SystemExit("vercel core upsert marker missing")
    delete_fn = '''export async function deleteProjectEnv(
  token: string,
  projectId: string,
  envId: string,
  teamId?: string,
): Promise<boolean> {
  const response = await fetch(
    withTeam(`https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}/env/${encodeURIComponent(envId)}`, teamId),
    { method: "DELETE", headers: buildHeaders(token) },
  );
  if (response.status === 404) return false;
  if (!response.ok) {
    throw new Error(
      `Failed to delete project environment entry ${envId}: ${response.status} ${await response.text()}`,
    );
  }
  return true;
}

'''
    core = core.replace(marker, delete_fn + marker, 1)
write(core_path, core)

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
  const explicit = process.env.VERCEL_PROJECT_ID?.trim();
  if (explicit) return explicit;
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
    throw new Error(
      `Missing local public gova values for: ${missing.join(", ")}. Deploy or resolve every owner runtime first.`,
    );
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

  console.log(
    "gova frontend environment synchronized: public routing/config only; undeclared business secrets removed.",
  );
}

main().catch((error) => {
  console.error(
    "Failed to synchronize gova frontend environment:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
''',
)

package_path = "package.json"
pkg = json.loads(read(package_path))
pkg["scripts"]["gova:env:sync"] = "npx tsx scripts/push-vercel-turso-env.ts"
pkg["scripts"]["db:push:vercel-env"] = "npm run gova:env:sync"
write(package_path, json.dumps(pkg, ensure_ascii=False, indent=2) + "\n")

build_path = "scripts/vercel-deployment-build.ts"
build = read(build_path)
old = '''  const foreign = foreignRuntimeEnvNames(runtime);
  if (foreign.length > 0) {
    console.warn(
      `[vercel-build] "${runtime}" holds ${foreign.length} undeclared secret name(s): ` +
        foreign.map((finding) => `${finding.name} (${finding.family})`).join(", "),
    );
  }'''
new = '''  const foreign = foreignRuntimeEnvNames(runtime);
  const foreignBusinessSecrets = foreign.filter(
    (finding) => finding.family !== "deployment credential",
  );
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
    raise SystemExit("vercel build foreign-env block missing")
write(build_path, build.replace(old, new, 1))

vt_path = "scripts/tests/vercel-deployment-guards.test.ts"
vt = read(vt_path)
if "const govaEnvSyncSource" not in vt:
    vt = vt.replace(
        'const deployWorkflowSource = read(".github/workflows/deploy-main.yml");\n',
        'const deployWorkflowSource = read(".github/workflows/deploy-main.yml");\nconst govaEnvSyncSource = read("scripts/push-vercel-turso-env.ts");\n',
        1,
    )
marker = 'assert.deepEqual(foreignRuntimeEnvNames("gova", filled), []);\n\n'
if marker not in vt:
    raise SystemExit("vercel guard test env marker missing")
contract = '''assert.match(buildSource, /foreignBusinessSecrets/);
assert.match(buildSource, /gova is frontend-only but holds undeclared business secret name/);
assert.match(govaEnvSyncSource, /GOVA_DECLARATION/);
assert.match(govaEnvSyncSource, /deleteProjectEnv/);
for (const forbidden of [
  "TURSO_DATABASE_URL",
  "TURSO_AUTH_TOKEN",
  "R2_SECRET_ACCESS_KEY",
  "ASOL_SESSION_SIGNING_SECRET",
]) {
  assert.equal(
    govaEnvSyncSource.includes(forbidden),
    false,
    `gova env sync must never push ${forbidden}`,
  );
}
assert.equal(pkg.scripts?.["gova:env:sync"], "npx tsx scripts/push-vercel-turso-env.ts");
assert.equal(pkg.scripts?.["db:push:vercel-env"], "npm run gova:env:sync");

'''
if "gova env sync must never push" not in vt:
    vt = vt.replace(marker, marker + contract, 1)
write(vt_path, vt)

coretest_path = "packages/vercel-deploy-core/src/tests/index.test.ts"
coretest = read(coretest_path)
if "deleteProjectEnv," not in coretest:
    coretest = coretest.replace(
        "  deployAccountService,\n} from '../index';",
        "  deployAccountService,\n  deleteProjectEnv,\n} from '../index';",
        1,
    )
if "project environment deletion stays in vercel-deploy-core" not in coretest:
    coretest = coretest.replace(
        "  assert(typeof ensureProject === 'function', 'D8: Module exported functions without executing main');",
        "  assert(typeof ensureProject === 'function', 'D8: Module exported functions without executing main');\n  assert(typeof deleteProjectEnv === 'function', 'D9: project environment deletion stays in vercel-deploy-core');",
        1,
    )
write(coretest_path, coretest)

# ── Documentation ────────────────────────────────────────────────────────────
sec_path = "docs/01-architecture/10-application-layers/security-rules.md"
sec = read(sec_path)
old = "When `ASOL_CORS_ORIGINS` is unset, dev defaults include localhost and Capacitor shell origins (`capacitor://localhost`, etc.)."
new = "`ASOL_CORS_ORIGINS` entries are exact origins. Trust never extends by string prefix to a subdomain or hostile suffix; `https://app.example` does not authorize `https://app.example.evil.tld`. `*` is accepted only when it is explicitly configured.\n\nWhen `ASOL_CORS_ORIGINS` is unset, no origin is reflected by the gova compatibility boundary."
if old not in sec:
    raise SystemExit("security rules CORS paragraph missing")
write(sec_path, sec.replace(old, new, 1))

runner_path = "docs/07-mobile-and-release/local-agent-runner-pool.md"
runner = read(runner_path)
old = "The permanent branch is never deleted after processing. Request IDs are recorded in machine-local coordination state and are single-use, so retained request files cannot execute twice. Requests must target `main`, must be fresh enough for the contract, and are rejected if their values look like secret material."
new = "The permanent branch is never deleted after processing. Request IDs are recorded in machine-local coordination state and are single-use, so retained request files cannot execute twice. On a GitHub push the gateway evaluates only request documents added or changed by that push; old malformed or rejected history therefore cannot make a later valid dispatch fail. Requests must target `main`, must be fresh enough for the contract, and are rejected if their values look like secret material."
if old not in runner:
    raise SystemExit("runner gateway documentation paragraph missing")
write(runner_path, runner.replace(old, new, 1))

ops_path = "docs/07-mobile-and-release/scripts-and-workflows.md"
ops = read(ops_path)
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
if anchor not in ops:
    raise SystemExit("scripts/workflows Vercel anchor missing")
para = "`npm run gova:env:sync` is the only supported environment synchronizer for the GitHub-linked gova project. It writes only the public frontend keys declared by `GOVA_DECLARATION` and deletes undeclared project environment entries, so Turso, R2, signing, push-provider, mail, and publishing credentials cannot remain attached to the frontend. The legacy `db:push:vercel-env` command is retained only as an alias to this safe operation; it no longer pushes database credentials. Dedicated service deployments provision their own declared environment instead.\n\n"
if "the only supported environment synchronizer for the GitHub-linked gova project" not in ops:
    ops = ops.replace(anchor, para + anchor, 1)
write(ops_path, ops)
PY

# Strong local gates first.
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

# Some test gates synchronize generated mirrors, so prove docs/architecture again.
npm run docs:generate
npm run docs:ci
npm run architecture:check

# Repeat the two adversarial proofs independently of normal test aliases.
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
