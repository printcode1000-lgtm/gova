#!/usr/bin/env python3
from pathlib import Path
p=Path('/home/hesham/gova-agents/integration/.agent-bootstrap/finalize-runtime.py')
s=p.read_text(encoding='utf8')
old='''    insert_anchor = '        - ".github/workflows/deploy-main.yml"\\n'\n    additions = '        - ".github/workflows/local-agent-bootstrap.yml"\\n        - "tools/local-agent/**"\\n'\n    if '.github/workflows/local-agent-bootstrap.yml' not in docs:\n        if insert_anchor not in docs: raise RuntimeError('docs workflow insertion anchor missing')\n        docs = docs.replace(insert_anchor, insert_anchor + additions, 1)\n    elif 'tools/local-agent/**' not in docs:\n        docs = docs.replace('        - ".github/workflows/local-agent-bootstrap.yml"\\n',\n                            '        - ".github/workflows/local-agent-bootstrap.yml"\\n        - "tools/local-agent/**"\\n', 1)\n'''
new='''    insert_anchor = '      - ".github/workflows/docs.yml"\\n'\n    additions = '      - ".github/workflows/local-agent-bootstrap.yml"\\n      - "tools/local-agent/**"\\n'\n    if '.github/workflows/local-agent-bootstrap.yml' not in docs:\n        if insert_anchor not in docs: raise RuntimeError('docs workflow insertion anchor missing')\n        docs = docs.replace(insert_anchor, insert_anchor + additions)\n    elif 'tools/local-agent/**' not in docs:\n        docs = docs.replace('      - ".github/workflows/local-agent-bootstrap.yml"\\n',\n                            '      - ".github/workflows/local-agent-bootstrap.yml"\\n      - "tools/local-agent/**"\\n')\n'''
if old not in s: raise SystemExit('expected finalizer docs fragment not found')
s=s.replace(old,new,1)
old1="policy, n = re.subn(r'function localWorkspaceViolations[\\s\\S]*?export function collectGithubCiPolicyErrors', bootstrap_validator, policy, count=1)"
new1="policy, n = re.subn(r'function localWorkspaceViolations[\\s\\S]*?export function collectGithubCiPolicyErrors', lambda _m: bootstrap_validator, policy, count=1)"
old2="policy, n = re.subn(r'  const localAgentInspectPath[\\s\\S]*?  const protectPath', collect_new, policy, count=1)"
new2="policy, n = re.subn(r'  const localAgentInspectPath[\\s\\S]*?  const protectPath', lambda _m: collect_new, policy, count=1)"
if old1 not in s or old2 not in s: raise SystemExit('expected finalizer regex replacement fragment not found')
s=s.replace(old1,new1,1).replace(old2,new2,1)
registry_anchor="    # The ruleset utility now has exactly two recognized refs and no package dependency.\n"
registry_block=r'''    # Remove the retired package from the canonical capability ownership registry.
    capability_path = ROOT/'packages/architecture-core/src/registry/capability-registry.ts'
    capability = capability_path.read_text(encoding='utf8')
    capability, removed_capability = re.subn(r"\n  \{\n    folder: 'local-agent-core',[\s\S]*?\n  \},", '', capability, count=1)
    if removed_capability != 1: raise RuntimeError('could not remove local-agent-core capability registry entry')
    capability_path.write_text(capability, encoding='utf8')
    phase('legacy-capability-registry-removed')

    # Retire machine-local runtime directories used only by the removed dispatch control plane.
    for old_runtime in [CANON/'.local/github-runners/gova-coordination', CANON/'.local/agent-worktrees']:
        if old_runtime.exists():
            shutil.rmtree(old_runtime)
            result['removed'].append(str(old_runtime))
    phase('legacy-machine-runtime-removed')

    # Update every binding agent instruction surface to the new two-branch + persistent-gateway model.
    branch_model = (
        "The repository has exactly two recognized remote branches: `main` and `integration`. "
        "`main` is the production/release branch. `integration` is the persistent non-production aggregation branch for verified agent results. "
        "Every agent performs mutable task work in a dedicated local Git worktree and local `agent/<agent>/<task>` branch under `/home/hesham/gova-agents`; task branches are never pushed to GitHub. "
        "Normal commands, coordination, locks, checkpoints, handoffs, and result streaming use the persistent `gova-agent-gateway` service directly, not GitHub Actions. "
        "Completed verified work is submitted through the gateway to `integration`. Never create, push, request, or depend on any third remote branch. Promotion from `integration` to `main` is a separate deliberate release action."
    )
    instruction_files = [Path('.agents/rules/agent-instructions.md'), Path('AGENTS.md'), Path('CLAUDE.md'), Path('GEMINI.md')]
    for rel in instruction_files:
        ip = ROOT/rel
        body = ip.read_text(encoding='utf8')
        body, count = re.subn(
            r'(## Fixed Two-Branch Repository Model\s*\n\n)[\s\S]*?(?=\n(?:## |<!-- BEGIN:nextjs-agent-rules -->)|\Z)',
            lambda m: m.group(1) + branch_model + '\n', body, count=1,
        )
        if count != 1: raise RuntimeError(f'could not update two-branch instruction section: {rel}')
        ip.write_text(body, encoding='utf8')

    adr = '''# ADR-0006: Fixed Two-Branch Repository Model\n\n## Status\n\nAccepted; superseded topology finalized 2026-09-02.\n\n## Context\n\nGitHub-dispatched agent commands and the permanent `agent-request/chatgpt` working branch created an unnecessary remote control plane. Agents now share a persistent local gateway that can multiplex commands, coordination, worktrees, checkpoints, and handoffs without creating a GitHub job per operation.\n\n## Decision\n\n1. The only recognized remote branches are `main` and `integration`.\n2. `main` remains the production/release branch and is never an agent scratch branch.\n3. `integration` is the persistent non-production aggregation branch for verified agent results.\n4. Each agent/task receives a local-only worktree and `agent/<agent>/<task>` branch under `/home/hesham/gova-agents`. These task branches must never be pushed.\n5. Normal agent work uses `gova-agent-gateway`; GitHub Actions is not the command transport.\n6. Verified completion uses the gateway `integration-submit` operation, serialized by an integration ref lock.\n7. No third remote ref, wildcard branch namespace, request branch, rescue branch, staging branch, or provider-generated branch is allowed.\n8. Promotion from `integration` to `main` is separate and deliberate.\n\n## Enforcement\n\n- `.githooks/pre-push.d/10-main-only` allows only `refs/heads/main` and `refs/heads/integration`.\n- `scripts/block-branch-creation.ts` maintains an active GitHub creation ruleset whose only exclusions are those two refs.\n- Agent task branches remain local-only.\n- `.github/workflows/local-agent-bootstrap.yml` is manual bootstrap/reinstall only.\n\n## Runtime\n\n- Gateway implementation: `tools/local-agent/`.\n- Runtime database: `/home/hesham/.local/share/gova-agent-runtime/runtime.sqlite3` (SQLite WAL).\n- Agent worktrees: `/home/hesham/gova-agents/`.\n- Persistent service: `gova-agent-gateway.service`.\n\n## Consequences\n\nAgent parallelism is local and does not create remote branch sprawl. Any agent can resume another task from persistent checkpoints/handoffs. GitHub is used for the two durable repository refs, not as an RPC bus.\n'''
    (ROOT/'docs/01-architecture/09-decisions/ADR-0006-main-only-branch.md').write_text(adr, encoding='utf8')

    ci_doc = '''# GitHub CI Policy\n\nGitHub Actions is not the normal transport for local-agent commands. The persistent local gateway owns command execution, coordination, worktrees, locks, checkpoints, handoffs, and result streaming.\n\n## Allowed workflows\n\nExactly three workflow files may exist under `.github/workflows/`:\n\n| Workflow | Trigger | Purpose |\n|---|---|---|\n| `deploy-main.yml` | push to `main` | Production deployment orchestration |\n| `docs.yml` | documentation-related push/PR to `main` | Documentation validation |\n| `local-agent-bootstrap.yml` | manual `workflow_dispatch` only | Install/reinstall the persistent gateway from `integration` |\n\n`local-agent-bootstrap.yml` runs only on `[self-hosted, Linux, X64, gova]`, reuses the host checkout and toolchain, performs no checkout/setup-node/npm-ci step, consumes no repository secret, and installs `tools/local-agent/install.sh` from `/home/hesham/gova-agents/integration`.\n\n## Normal agent path\n\nAfter bootstrap, agents call `gova-agent-gateway` directly. A command must not create a GitHub Actions run. Each task gets a local worktree and local `agent/<agent>/<task>` branch. Verified completion is serialized into remote `integration` through the gateway. No task branch is pushed.\n\n## Repository branches\n\nThe only remote branches are `main` and `integration`. `main` is production/release. `integration` is non-production aggregation. A repository creation ruleset blocks every other branch.\n\n## Deployment filtering\n\n`deploy-main.yml` excludes `tools/local-agent/**` and documentation/control-only paths because gateway implementation changes do not alter the served application.\n\n## Prohibited\n\n- Any Local Runner workflow other than the manual bootstrap workflow.\n- Push/pull-request/schedule/repository-dispatch triggers on the bootstrap workflow.\n- GitHub Actions as a per-command RPC mechanism.\n- Remote agent task branches or any remote ref other than `main` and `integration`.\n- Branch protection or required checks that block direct updates to `main`.\n- General application correctness CI.\n'''
    (ROOT/'docs/07-mobile-and-release/github-ci-policy.md').write_text(ci_doc, encoding='utf8')

    runner_doc = '''# Persistent Local Agent Runtime\n\n## Purpose\n\n`/home/hesham/gova` is the canonical repository clone and Git object source. Agents do not mutate it as a shared task workspace. The persistent `gova-agent-gateway` multiplexes all agent operations after a one-time/manual GitHub bootstrap.\n\n## Topology\n\n```text\nGitHub Actions (manual bootstrap/recovery only)\n  -> gova self-hosted runner\n     -> tools/local-agent/install.sh\n        -> gova-agent-gateway.service\n\nAgents\n  <-> persistent gateway API\n      <-> SQLite WAL runtime state\n      <-> isolated local Git worktrees\n      <-> integration submit lock\n```\n\nNormal agent commands do not create GitHub jobs.\n\n## Filesystem\n\n- Canonical clone: `/home/hesham/gova`.\n- Agent/task worktrees: `/home/hesham/gova-agents/<agent>/<task>/`.\n- Shared integration worktree: `/home/hesham/gova-agents/integration`.\n- Runtime state: `/home/hesham/.local/share/gova-agent-runtime/runtime.sqlite3`.\n- Authentication material: `/home/hesham/.config/gova-agent/auth`.\n- Installed gateway code: `/home/hesham/.local/lib/gova-agent/`.\n\nEach task uses a local-only `agent/<agent>/<task>` branch. These branches are filesystem/Git isolation details and are never published.\n\n## Persistent state and coordination\n\nThe runtime stores agents, sessions, tasks, commands, locks, messages, handoffs, and append-only events. Tasks persist goal, completed work, remaining work, decisions, modified files, commits, commands, tests/results, failures, blockers, dependencies, next action, and handoff notes so another equal-capability agent can resume at any time.\n\nLocks are leased and stale locks are recoverable. Command stdout/stderr and exit state are persisted independently from the requesting connection.\n\n## Integration\n\nRemote GitHub state is limited to `main` and `integration`. Completed verified task commits are submitted through `/v1/integration/submit`, which serializes integration with a ref lock, verifies requested commands, and publishes `integration` through the authenticated GitHub API. Promotion to `main` is outside normal agent task completion.\n\n## Bootstrap\n\n`.github/workflows/local-agent-bootstrap.yml` is the only Local Runner workflow and is manual-only. It exists for first install/reinstall/recovery. It is not a command channel and must not be triggered by pushes after migration.\n\n## Retired architecture\n\nThe GitHub-dispatch workflows, request branch, repository control-plane package/scripts, and old machine-local coordination/worktree directories are retired. There must be no second active control plane alongside the persistent gateway.\n'''
    (ROOT/'docs/07-mobile-and-release/local-agent-runner-pool.md').write_text(runner_doc, encoding='utf8')

    # Update remaining current documentation references and remove lines that name retired executable surfaces.
    exclude_history = ROOT/'docs/09-agent-knowledge/local-agent-runtime.md'
    retired_tokens = tuple(OLD_WORKFLOWS) + ('scripts/local-agent-*.ts', '@asol/local-agent-core')
    scan_roots = [ROOT/'docs', ROOT/'.agents']
    for scan_root in scan_roots:
        if not scan_root.exists(): continue
        for md in scan_root.rglob('*.md'):
            if md == exclude_history: continue
            text = md.read_text(encoding='utf8')
            text = text.replace('agent-request/chatgpt', 'integration')
            kept=[]
            for line in text.splitlines():
                if any(token in line for token in retired_tokens):
                    continue
                kept.append(line)
            text='\n'.join(kept).rstrip()+'\n'
            md.write_text(text, encoding='utf8')
    phase('legacy-documentation-retired')

'''
if registry_anchor not in s: raise SystemExit('expected ruleset anchor not found')
s=s.replace(registry_anchor,registry_block+registry_anchor,1)
anchor='    # Modernize the GitHub CI policy without touching its docs/deploy policy logic.\n'
block='''    # Keep production deployment blind to persistent local-agent control-plane changes.\n    deploy_path = ROOT/'.github/workflows/deploy-main.yml'\n    deploy = deploy_path.read_text(encoding='utf8')\n    for retired in ['      - ".agent-control/**"\\n', '      - "packages/local-agent-core/**"\\n', '      - "scripts/local-agent-*.ts"\\n']:\n        deploy = deploy.replace(retired, '')\n    if '      - "tools/local-agent/**"\\n' not in deploy:\n        paths_anchor = '    paths-ignore:\\n'\n        if paths_anchor not in deploy: raise RuntimeError('deploy-main paths-ignore anchor missing')\n        deploy = deploy.replace(paths_anchor, paths_anchor + '      - "tools/local-agent/**"\\n', 1)\n    deploy_path.write_text(deploy, encoding='utf8')\n\n'''
if anchor not in s: raise SystemExit('expected finalizer deploy-policy anchor not found')
s=s.replace(anchor,block+anchor,1)
lock_anchor="    run(['npm','install','--package-lock-only','--ignore-scripts'])\n    phase('workspace-metadata-refreshed')\n"
lock_new="    run(['npm','install','--package-lock-only','--ignore-scripts'])\n    phase('workspace-metadata-refreshed')\n    run(['npx','tsx','scripts/runtime-compatibility-reference.ts','--write','--confirm-reviewed-compatible-tree'])\n    phase('runtime-compatibility-reference-refreshed')\n"
if lock_anchor not in s: raise SystemExit('expected runtime compatibility insertion anchor not found')
s=s.replace(lock_anchor,lock_new,1)
docs_anchor="    run(['npm','run','docs:generate'])\n    checks = [\n"
docs_new="    run(['npm','run','architecture:docs'])\n    phase('architecture-docs-regenerated')\n    run(['npm','run','docs:generate'])\n    checks = [\n"
if docs_anchor not in s: raise SystemExit('expected architecture docs insertion anchor not found')
s=s.replace(docs_anchor,docs_new,1)
p.write_text(s,encoding='utf8')
print('finalizer repaired and legacy documentation retirement injected')
