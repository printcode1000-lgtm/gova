#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="${GOVA_LOCAL_WORKSPACE:-/home/hesham/gova}"
BRANCH="agent-request/chatgpt"
: "${GH_PUSH_TOKEN:?GH_PUSH_TOKEN required}"
WT="$ROOT/.local/asol-final-${GITHUB_RUN_ID:-manual}-$$"
REPO="https://x-access-token:${GH_PUSH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
cleanup(){ cd "$ROOT" 2>/dev/null || true; git -C "$ROOT" worktree remove --force "$WT" >/dev/null 2>&1 || true; rm -rf "$WT" >/dev/null 2>&1 || true; }
trap cleanup EXIT

git -C "$ROOT" fetch origin "$BRANCH" main
git -C "$ROOT" worktree add --detach "$WT" "origin/$BRANCH"
cd "$WT"
git remote set-url origin "$REPO"
git config user.name gova-local-agent
git config user.email gova-local-agent@users.noreply.github.com

run(){ echo; echo ">>> $*"; "$@"; }
commit_push(){ local m="$1"; git add -A; if git diff --cached --quiet; then echo "clean: $m"; return; fi; git commit -m "[asol-long-run] $m"; git push origin "HEAD:$BRANCH"; echo "pushed: $m @ $(git rev-parse HEAD)"; }

# Make iOS push validation hermetic: the Firebase plist is intentionally gitignored.
python3 - <<'PY'
from pathlib import Path
p=Path('packages/native-core/scripts/validate-ios-push-policy.ts')
s=p.read_text()
old='const firebaseConfig = read("ios/App/App/GoogleService-Info.plist");'
new='''const firebaseConfigPath = "ios/App/App/GoogleService-Info.plist";\nconst firebaseConfig = existsSync(path.resolve(firebaseConfigPath))\n  ? read(firebaseConfigPath)\n  : null;'''
if old in s: s=s.replace(old,new)
old_loop='''for (const [key, value] of [\n  ["BUNDLE_ID", expected.bundleId],\n  ["PROJECT_ID", expected.firebaseProjectId],\n  ["GCM_SENDER_ID", expected.firebaseProjectNumber],\n  ["GOOGLE_APP_ID", expected.firebaseAppId],\n] as const) {\n  requireText(\n    firebaseConfig,\n    `<key>${key}</key>`,\n    `GoogleService-Info.plist is missing ${key}.`,\n  );\n  requireText(\n    firebaseConfig,\n    `<string>${value}</string>`,\n    `GoogleService-Info.plist ${key} identity is incorrect.`,\n  );\n}'''
new_loop='''if (firebaseConfig) {\n  for (const [key, value] of [\n    ["BUNDLE_ID", expected.bundleId],\n    ["PROJECT_ID", expected.firebaseProjectId],\n    ["GCM_SENDER_ID", expected.firebaseProjectNumber],\n    ["GOOGLE_APP_ID", expected.firebaseAppId],\n  ] as const) {\n    requireText(firebaseConfig, `<key>${key}</key>`, `GoogleService-Info.plist is missing ${key}.`);\n    requireText(firebaseConfig, `<string>${value}</string>`, `GoogleService-Info.plist ${key} identity is incorrect.`);\n  }\n} else {\n  const gitignore = read(".gitignore");\n  if (!gitignore.split(/\\r?\\n/).some((line) => line.trim() === firebaseConfigPath)) {\n    errors.push("GoogleService-Info.plist is absent and must be explicitly gitignored.");\n  }\n}'''
if old_loop not in s: raise SystemExit('firebase validation block not found')
s=s.replace(old_loop,new_loop)
p.write_text(s)
PY

# Remove temporary orchestration artifacts before repository policy checks.
rm -f .github/workflows/asol-long-repair.yml scripts/asol-long-repair.sh scripts/asol-long-repair-resume.sh scripts/asol-finalize-repair.sh
rm -rf .agent-control/requests

npm ci --ignore-scripts
run npm run architecture:docs
run npm run services:sync
run npm run docs:generate
run npm run ios:push:validate
run npm run docs:ci
run npm run architecture:check
run npm run github:ci-policy
commit_push "make iOS push validation hermetic and remove repair orchestration"

echo '=== FULL VERIFICATION ==='
run npm run verify:all
run npm test
run npm run architecture:docs
run npm run docs:generate
run npm run docs:ci
run npm run architecture:check
commit_push "complete full repository verification"

echo '=== GOVA ISOLATION + ADVERSARIAL ==='
rm -rf .tmp-gova-build
run npm run gova:tree
run bash -lc 'cd .tmp-gova-build && ASOL_RUNTIME_ROLE=gova-frontend node ../node_modules/next/dist/bin/next build'
if [[ -f scripts/verify-gova-production-artifact.ts ]]; then run npx tsx scripts/verify-gova-production-artifact.ts .tmp-gova-build/.next; fi
! grep -Fq 'origin.startsWith(entry)' src/proxy.ts
! grep -Fq 'preflightFor(request' src/proxy.ts
run env ASOL_CORS_ORIGINS=https://trusted.example NEXT_PUBLIC_ASOL_CONTROL_URL=https://control.example NEXT_PUBLIC_ASOL_PRODUCTS_URL=https://products.example NEXT_PUBLIC_ASOL_SUB2MAIN_URL=https://sub2main.example NEXT_PUBLIC_ASOL_SUBMAIN_URL=https://submain.example NEXT_PUBLIC_ASOL_ORDERS_URL=https://orders.example NEXT_PUBLIC_ASOL_PROFILES_URL=https://profiles.example npx tsx src/core/api/tests/compatibility-boundary.test.ts
commit_push "prove gova isolation and adversarial security"

echo 'ASOL_CODE_COMPLETE=PASS'
echo "FINAL_BRANCH_SHA=$(git rev-parse HEAD)"
