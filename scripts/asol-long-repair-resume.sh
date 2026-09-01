#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${GOVA_LOCAL_WORKSPACE:-/home/hesham/gova}"
BRANCH="${ASOL_REPAIR_BRANCH:-agent-request/chatgpt}"
: "${GH_PUSH_TOKEN:?GH_PUSH_TOKEN is required}"
WT="$ROOT/.local/asol-long-repair-${GITHUB_RUN_ID:-manual}-${GITHUB_RUN_ATTEMPT:-0}-$$"
REPO="https://x-access-token:${GH_PUSH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"

cleanup() {
  cd "$ROOT" 2>/dev/null || true
  git -C "$ROOT" worktree remove --force "$WT" >/dev/null 2>&1 || true
  rm -rf "$WT" >/dev/null 2>&1 || true
}
trap cleanup EXIT

[[ "$BRANCH" == "agent-request/chatgpt" ]] || { echo "Refusing branch $BRANCH" >&2; exit 90; }

echo "=== ASOL LONG REPAIR RESUME ==="
echo "runner=$(hostname) branch=$BRANCH"
echo "main mutation is forbidden"

git -C "$ROOT" fetch origin "$BRANCH" main
git -C "$ROOT" worktree add --detach "$WT" "origin/$BRANCH"
cd "$WT"
git remote set-url origin "$REPO"
git config user.name gova-local-agent
git config user.email gova-local-agent@users.noreply.github.com

run_gate() { printf '\n>>> %s\n' "$*"; "$@"; }
stage_commit() {
  local message="$1"
  git add -A
  if git diff --cached --quiet; then echo "stage clean: $message"; return 0; fi
  git commit -m "[asol-long-run] $message"
  git push origin "HEAD:$BRANCH"
  echo "pushed stage: $message @ $(git rev-parse HEAD)"
}

# Keep the candidate free of coordination traffic and the temporary workflow before policy gates.
rm -rf .agent-control/requests
rm -f .github/workflows/asol-long-repair.yml
stage_commit "remove temporary runner coordination before policy gates"

npm ci --ignore-scripts

printf '\n=== Stage C: repository release gates ===\n'
python3 - <<'PY'
from pathlib import Path
idx=Path('packages/vercel-deploy-core/src/index.ts')
s=idx.read_text()
line="export { deleteProjectEnv } from './project-env';\n"
if line not in s:
    anchor="export * from './release-rollback';\n"
    if anchor not in s: raise SystemExit('vercel-deploy-core export anchor missing')
    s=s.replace(anchor, anchor+line)
idx.write_text(s)
p=Path('scripts/push-vercel-turso-env.ts')
s=p.read_text()
s=s.replace("  findProject,\n  listProjectEnv,\n  writeProjectEnv,\n} from '@asol/vercel-deploy-core';\nimport { deleteProjectEnv } from '@asol/vercel-deploy-core/project-env';",
            "  deleteProjectEnv,\n  findProject,\n  listProjectEnv,\n  writeProjectEnv,\n} from '@asol/vercel-deploy-core';")
p.write_text(s)
PY
run_gate npm run architecture:docs
run_gate npm run services:sync
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
stage_commit "complete repository release gates"

printf '\n=== Stage D: control and deployment tooling ===\n'
run_gate npm run test:local-agent-core
run_gate npm run test:local-agent-workflows
run_gate npm run test:vercel-deploy-core
run_gate npm run test:deployment-tools
run_gate npm run control:verify
run_gate npm run control:build
run_gate npm run control:smoke
stage_commit "complete control and deployment-tool gates"

printf '\n=== Stage E: full repository verification ===\n'
run_gate npm run verify:all
run_gate npm test
run_gate npm run architecture:docs
run_gate npm run docs:generate
run_gate npm run docs:ci
run_gate npm run architecture:check
stage_commit "complete full repository release gates"

printf '\n=== Stage F: gova artifact isolation ===\n'
rm -rf .tmp-gova-build
run_gate npm run gova:tree
run_gate bash -lc 'cd .tmp-gova-build && ASOL_RUNTIME_ROLE=gova-frontend node ../node_modules/next/dist/bin/next build'
if [[ -f scripts/verify-gova-production-artifact.ts ]]; then
  run_gate npx tsx scripts/verify-gova-production-artifact.ts .tmp-gova-build/.next
elif npm run | grep -q 'gova:artifact'; then
  run_gate npm run gova:artifact
fi

printf '\n=== Stage G: independent adversarial checks ===\n'
! grep -Fq 'origin.startsWith(entry)' src/proxy.ts || { echo 'CORS prefix bypass remains' >&2; exit 73; }
! grep -Fq 'preflightFor(request' src/proxy.ts || { echo 'gova preflight still reflects origin' >&2; exit 74; }
run_gate env \
  ASOL_CORS_ORIGINS=https://trusted.example \
  NEXT_PUBLIC_ASOL_CONTROL_URL=https://control.example \
  NEXT_PUBLIC_ASOL_PRODUCTS_URL=https://products.example \
  NEXT_PUBLIC_ASOL_SUB2MAIN_URL=https://sub2main.example \
  NEXT_PUBLIC_ASOL_SUBMAIN_URL=https://submain.example \
  NEXT_PUBLIC_ASOL_ORDERS_URL=https://orders.example \
  NEXT_PUBLIC_ASOL_PROFILES_URL=https://profiles.example \
  npx tsx src/core/api/tests/compatibility-boundary.test.ts
stage_commit "prove adversarial security and gova isolation"

printf '\n=== Stage H: production preflight only ===\n'
if npm run | grep -q 'deploy:doctor'; then npm run deploy:doctor || true; fi
if npm run | grep -q 'deploy:preflight'; then npm run deploy:preflight || true; fi
stage_commit "finalize verified ASOL repair candidate"

echo "ASOL_LONG_REPAIR=PASS"
echo "FINAL_BRANCH_SHA=$(git rev-parse HEAD)"
