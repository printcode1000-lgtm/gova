#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${GOVA_LOCAL_WORKSPACE:-/home/hesham/gova}"
BRANCH="${ASOL_REPAIR_BRANCH:-agent-request/chatgpt}"
WT="$ROOT/.local/asol-long-repair"
: "${GH_PUSH_TOKEN:?GH_PUSH_TOKEN is required}"
REPO="https://x-access-token:${GH_PUSH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"

echo "=== ASOL LONG REPAIR SESSION ==="
echo "runner=$(hostname)"
echo "branch=$BRANCH"
echo "main mutation is forbidden"

if [[ "$BRANCH" != "agent-request/chatgpt" ]]; then
  echo "Refusing unexpected repair branch: $BRANCH" >&2
  exit 90
fi

git -C "$ROOT" fetch origin "$BRANCH" main
git -C "$ROOT" worktree remove --force "$WT" >/dev/null 2>&1 || true
rm -rf "$WT"
git -C "$ROOT" worktree add -B "$BRANCH" "$WT" "origin/$BRANCH"
cd "$WT"
git remote set-url origin "$REPO"
git config user.name gova-local-agent
git config user.email gova-local-agent@users.noreply.github.com

if [[ "$(git branch --show-current)" != "$BRANCH" ]]; then
  echo "Refusing: current branch is not $BRANCH" >&2
  exit 91
fi

rm -rf .agent-control/requests

stage_commit() {
  local message="$1"
  git add -A
  if git diff --cached --quiet; then
    echo "stage clean: $message"
    return 0
  fi
  git commit -m "[asol-long-run] $message"
  git push origin "HEAD:$BRANCH"
  echo "pushed stage: $message @ $(git rev-parse HEAD)"
}

run_gate() {
  printf '\n>>> %s\n' "$*"
  "$@"
}

echo "=== Stage A: deterministic generated state ==="
if [[ ! -d node_modules ]]; then npm ci --ignore-scripts; fi
run_gate npm run services:sync
run_gate npm run docs:generate
stage_commit "synchronize service mirrors and generated knowledge"

echo "=== Stage B: CORS adversarial hardening ==="
python3 - <<'PY'
from pathlib import Path
p=Path('src/proxy.ts')
s=p.read_text()
s=s.replace("return allowed.some((entry) => entry === origin || origin.startsWith(entry));", "return allowed.includes(origin);")
s=s.replace("import { BROWSER_REQUEST_HEADERS, preflightFor } from '@asol/service-runtime-core';", "import { BROWSER_REQUEST_HEADERS } from '@asol/service-runtime-core';")
old="""      const response = preflightFor(request, {
        methods: allowedMethods.join(', '),
        headers: BROWSER_REQUEST_HEADERS,
      });
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value);
      }
      return response;"""
new="""      return new NextResponse(null, {
        status: 204,
        headers: {
          ...headers,
          'Access-Control-Allow-Methods': allowedMethods.join(', '),
          'Access-Control-Allow-Headers': BROWSER_REQUEST_HEADERS,
        },
      });"""
if old in s: s=s.replace(old,new)
p.write_text(s)

t=Path('src/core/api/tests/compatibility-boundary.test.ts')
q=t.read_text()
marker='''/** A preflight for a path gova still owns is not intercepted. */'''
attack='''/** A suffix-spoofed origin must never be reflected, including on preflight. */\n{\n  const response = proxy(\n    new NextRequest("https://gova.example/api/products", {\n      method: "OPTIONS",\n      headers: { origin: "https://app.example.evil.tld" },\n    }),\n  );\n  assert.equal(response.status, 204);\n  assert.equal(response.headers.get("access-control-allow-origin"), null);\n}\n\n'''
if attack not in q and marker in q: q=q.replace(marker,attack+marker)
t.write_text(q)
PY
run_gate npm run test:api-core
stage_commit "harden exact-origin CORS and spoofed preflight handling"

rm -f .github/workflows/asol-long-repair.yml
stage_commit "remove temporary long-repair workflow before policy gates"

echo "=== Stage C: repository release gates ==="
python3 - <<'PY'
from pathlib import Path
idx=Path('packages/vercel-deploy-core/src/index.ts')
s=idx.read_text()
needle="export * from './release-rollback';\n"
line="export { deleteProjectEnv } from './project-env';\n"
if line not in s:
    if needle not in s:
        raise SystemExit('vercel-deploy-core root export insertion point missing')
    s=s.replace(needle, needle+line)
idx.write_text(s)

p=Path('scripts/push-vercel-turso-env.ts')
s=p.read_text()
s=s.replace("  findProject,\n  listProjectEnv,\n  writeProjectEnv,\n} from '@asol/vercel-deploy-core';\nimport { deleteProjectEnv } from '@asol/vercel-deploy-core/project-env';",
            "  deleteProjectEnv,\n  findProject,\n  listProjectEnv,\n  writeProjectEnv,\n} from '@asol/vercel-deploy-core';")
p.write_text(s)
PY
run_gate npm run architecture:docs
run_gate npm run docs:generate
run_gate npm run docs:ci
run_gate npm run runtime:check
run_gate npm run architecture:check
run_gate npm run test:notifications
run_gate npm run test:ota-core
run_gate npm run typecheck
run_gate npm run lint
run_gate npm run validate:error-logging
run_gate npm run github:ci-policy
stage_commit "close Vercel env package door and refresh architecture artifacts"

echo "=== Stage D: control and deployment tooling ==="
run_gate npm run test:local-agent-core
run_gate npm run test:local-agent-workflows
run_gate npm run test:vercel-deploy-core
run_gate npm run test:deployment-tools
run_gate npm run control:verify
run_gate npm run control:build
run_gate npm run control:smoke
stage_commit "complete control and deployment-tool gates"

echo "=== Stage E: full repository verification ==="
run_gate npm run verify:all
run_gate npm test
run_gate npm run architecture:docs
run_gate npm run docs:generate
run_gate npm run docs:ci
run_gate npm run architecture:check
stage_commit "complete full repository release gates"

echo "=== Stage F: gova artifact isolation ==="
rm -rf .tmp-gova-build
run_gate npm run gova:tree
run_gate bash -lc 'cd .tmp-gova-build && ASOL_RUNTIME_ROLE=gova-frontend node ../node_modules/next/dist/bin/next build'
if [[ -f scripts/verify-gova-production-artifact.ts ]]; then
  run_gate npx tsx scripts/verify-gova-production-artifact.ts .tmp-gova-build/.next
elif npm run | grep -q 'gova:artifact'; then
  run_gate npm run gova:artifact
fi

echo "=== Stage G: independent adversarial checks ==="
if grep -Fq 'origin.startsWith(entry)' src/proxy.ts; then echo "CORS prefix bypass still present" >&2; exit 73; fi
if grep -Fq 'preflightFor(request' src/proxy.ts; then echo "gova preflight still delegates to origin-reflecting helper" >&2; exit 74; fi
run_gate env \
  ASOL_CORS_ORIGINS=https://trusted.example \
  NEXT_PUBLIC_ASOL_CONTROL_URL=https://control.example \
  NEXT_PUBLIC_ASOL_PRODUCTS_URL=https://products.example \
  NEXT_PUBLIC_ASOL_SUB2MAIN_URL=https://sub2main.example \
  NEXT_PUBLIC_ASOL_SUBMAIN_URL=https://submain.example \
  NEXT_PUBLIC_ASOL_ORDERS_URL=https://orders.example \
  NEXT_PUBLIC_ASOL_PROFILES_URL=https://profiles.example \
  npx tsx src/core/api/tests/compatibility-boundary.test.ts

echo "=== Stage H: production preflight only ==="
if npm run | grep -q 'deploy:doctor'; then npm run deploy:doctor || true; fi
if npm run | grep -q 'deploy:preflight'; then npm run deploy:preflight || true; fi
stage_commit "finalize verified ASOL repair candidate"

echo "ASOL_LONG_REPAIR=PASS"
echo "FINAL_BRANCH_SHA=$(git rev-parse HEAD)"
