#!/usr/bin/env python3
import json, re, shutil
from pathlib import Path
ROOT=Path('/home/hesham/gova-agents/integration')

# Remove npm entry points whose implementation is being retired.
pkg_path=ROOT/'package.json'
pkg=json.loads(pkg_path.read_text(encoding='utf8'))
scripts=pkg.get('scripts',{})
for key in list(scripts):
    if key.startswith('local-agent:') or key in {'test:local-agent-core','test:local-agent-workflows'}:
        scripts.pop(key,None)
pkg_path.write_text(json.dumps(pkg,ensure_ascii=False,indent=2)+'\n',encoding='utf8')

# Remove the old control-plane integration test and replace CI-policy tests with the persistent-bootstrap contract.
old_test=ROOT/'scripts/tests/local-agent-control-plane.test.ts'
if old_test.exists(): old_test.unlink()
ci_test=ROOT/'scripts/tests/github-ci-policy.test.ts'
ci_test.write_text(r'''import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  ALLOWED_WORKFLOW_FILES,
  deploymentWorkflowViolations,
  docsWorkflowViolations,
  localAgentBootstrapWorkflowViolations,
  verifyGithubCiPolicy,
} from "../github-ci-policy";

const root = process.cwd();
const live = verifyGithubCiPolicy();
assert.deepEqual(live, [], live.join("\n"));
assert.deepEqual([...ALLOWED_WORKFLOW_FILES], ["deploy-main.yml", "docs.yml", "local-agent-bootstrap.yml"]);

const docs = readFileSync(path.join(root, ".github/workflows/docs.yml"), "utf8");
const deploy = readFileSync(path.join(root, ".github/workflows/deploy-main.yml"), "utf8");
const bootstrap = readFileSync(path.join(root, ".github/workflows/local-agent-bootstrap.yml"), "utf8");

assert.deepEqual(docsWorkflowViolations(docs), []);
assert.deepEqual(deploymentWorkflowViolations(deploy), []);
assert.deepEqual(localAgentBootstrapWorkflowViolations(bootstrap), []);

assert.ok(localAgentBootstrapWorkflowViolations(bootstrap.replace("contents: read", "contents: write")).some((e) => e.includes("read-only")));
assert.ok(localAgentBootstrapWorkflowViolations(bootstrap.replace("runs-on: [self-hosted, Linux, X64, gova]", "runs-on: ubuntu-latest")).some((e) => e.includes("self-hosted")));
assert.ok(localAgentBootstrapWorkflowViolations(`${bootstrap}\n      - run: npm ci\n`).some((e) => e.includes("npm ci") || e.includes("forbidden")));
assert.ok(localAgentBootstrapWorkflowViolations(`${bootstrap}\n      TOKEN: \${{ secrets.GITHUB_TOKEN }}\n`).some((e) => e.includes("secrets")));
assert.ok(localAgentBootstrapWorkflowViolations(bootstrap.replace("workflow_dispatch:", "push:")).some((e) => e.includes("manual") || e.includes("push")));
assert.ok(deploymentWorkflowViolations(deploy.replace("id-token: write", "id-token: read")).some((e) => e.includes("id-token: write")));
assert.ok(docsWorkflowViolations(`${docs}\n      - run: npm run lint\n`).some((e) => e.includes("npm run lint") || e.includes("not allowed")));

console.log("GitHub CI policy tests passed for docs + deploy + persistent local-agent bootstrap.");
''',encoding='utf8')

# Rewrite the workflow/branch sections of the operations contract to match the persistent gateway.
sw_path=ROOT/'docs/07-mobile-and-release/scripts-and-workflows.md'
sw=sw_path.read_text(encoding='utf8')
ci_section='''## GitHub CI and `main`\n\nSee [github-ci-policy.md](./github-ci-policy.md). GitHub Actions is not the command transport for local agents. The only local-agent workflow is the manual `local-agent-bootstrap.yml`, used for initial install/reinstall/recovery of `gova-agent-gateway.service`. Normal agent commands, reads, writes, locks, messages, checkpoints, handoffs, and streaming results travel directly through the persistent gateway and create no GitHub Actions run.\n\nThe production deploy workflow remains tied to pushes on `main`. Documentation validation remains path-filtered. `tools/local-agent/**` is control-plane-only and is excluded from production deployment triggering. Agent task work is isolated in local worktrees under `/home/hesham/gova-agents` and is submitted to `integration` only after verification.\n'''
sw,n=re.subn(r'## GitHub CI and `main`\n[\s\S]*?(?=\n## Branch protection)',ci_section+'\n',sw,count=1)
if n!=1: raise SystemExit('scripts-and-workflows GitHub CI section anchor not found')
branch_section='''## Fixed two-branch repository model\n\nThe only recognized remote branches are:\n\n- `main` — production and release.\n- `integration` — persistent non-production aggregation for verified agent results.\n\nNo third remote branch is allowed. Every task-specific `agent/<agent>/<task>` ref is local-only and must never be pushed. `.githooks/pre-push.d/10-main-only` and the GitHub creation ruleset enforce the exact two-ref remote allowlist. Promotion from `integration` to `main` is a separate deliberate release action.\n'''
sw,n=re.subn(r'## Fixed two-branch repository model\n[\s\S]*?(?=\n## The pre-push hook)',branch_section+'\n',sw,count=1)
if n!=1: raise SystemExit('scripts-and-workflows branch section anchor not found')
sw_path.write_text(sw,encoding='utf8')

# Remove accidental tracked bytecode; verification must not recreate it.
pycache=ROOT/'tools/local-agent/__pycache__'
if pycache.exists(): shutil.rmtree(pycache)

# Refine the finalizer's active-reference check: generated search indexes and explicit negative assertions are not active control-plane surfaces.
fin=ROOT/'.agent-bootstrap/finalize-runtime.py'
s=fin.read_text(encoding='utf8')
old="legacy_lines=[line for line in grep.stdout.splitlines() if 'docs/09-agent-knowledge/local-agent-runtime.md' not in line]"
new="legacy_lines=[line for line in grep.stdout.splitlines() if 'docs/09-agent-knowledge/local-agent-runtime.md' not in line and not line.startswith('docs/09-agent-knowledge/generated/') and not line.startswith('scripts/github-ci-policy.ts:')]"
if old not in s: raise SystemExit('legacy active-reference filter anchor not found')
s=s.replace(old,new,1)
state_anchor="os.environ['DOCS_CONTRACT_CHANGE']='1'\n"
if state_anchor not in s: raise SystemExit('docs auth anchor missing before bytecode setting')
s=s.replace(state_anchor,state_anchor+"os.environ['PYTHONDONTWRITEBYTECODE']='1'\n",1)
fin.write_text(s,encoding='utf8')
print('retired npm/test/docs surfaces removed; CI policy test modernized; bytecode disabled')
