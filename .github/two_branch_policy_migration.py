from __future__ import annotations

import json
import re
import subprocess
import urllib.request
from pathlib import Path

ROOT = Path.cwd()
CHATGPT_BRANCH = "agent-request/chatgpt"
MAIN_REF = "refs/heads/main"
CHATGPT_REF = f"refs/heads/{CHATGPT_BRANCH}"


def read(path: str) -> str:
    return (ROOT / path).read_text()


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text)


def run(*args: str) -> None:
    subprocess.run(args, cwd=ROOT, check=True)


ADR = """# ADR-0006: Fixed Two-Branch Repository Model

## Status

Accepted (2026-08), finalized 2026-08-31

## Context

The repository previously used a main-only policy while local-agent infrastructure temporarily allowed provider and control-plane branch namespaces. That model created branch accumulation and ambiguous branch ownership.

The repository now has a permanent two-branch topology. This is the normal repository model, not an exception model.

## Decision

1. The repository has exactly two recognized remote branches: `main` and `agent-request/chatgpt`.
2. `main` is the canonical production and release branch and the source used by the GitHub-linked Vercel production deployment.
3. `agent-request/chatgpt` is the canonical persistent ChatGPT working branch. It is a first-class project branch, not an exception, temporary branch, gateway branch, or disposable request branch.
4. No third remote branch may be created for any reason. This includes feature branches, pull-request branches, provider-generated branches, `codex/**`, other `agent-request/**` refs, `agent-control`, rescue branches, staging branches, and temporary automation branches.
5. Agents that need isolation may use local git worktrees or unpushed local refs, but remote publication is limited to the two recognized branches.
6. ChatGPT work is prepared on `agent-request/chatgpt`; intentional verified work may later be integrated into `main`.
7. Other agents may work directly against `main` according to project rules. They must never create a remote branch to obtain isolation.
8. The pre-push hook and GitHub repository ruleset must enforce the exact two-ref allowlist. Namespace wildcards are forbidden.
9. Historical filenames or command names containing `main-only` may remain only where renaming would break stable references; their behavior and documentation must implement this two-branch decision.
10. No workflow, tool, MCP, skill, cloud agent, local agent, or automation may weaken this branch model without a new explicit user-authorized contract change.

## Recognized Branches

| Branch | Role | Lifecycle |
|---|---|---|
| `main` | Production, release, canonical integration | Permanent |
| `agent-request/chatgpt` | Persistent ChatGPT/OpenAI working branch | Permanent |

These two branches are peers in repository legitimacy but have different runtime roles. Only `main` is a production/release source.

## Forbidden Remote Refs

Everything except the two exact refs above is forbidden. In particular, the following former patterns are not branch allowances:

- `codex/**`
- `agent-request/**` other than `agent-request/chatgpt`
- `agent-control`
- feature, staging, rescue, temporary, probe, release, or provider-generated branches

## Enforcement

- Local hook: `.githooks/pre-push.d/10-main-only` permits updates only to `refs/heads/main` and `refs/heads/agent-request/chatgpt`; deleting stray unauthorized branches remains allowed.
- GitHub ruleset: active creation rule covers all branches and excludes exactly `refs/heads/main` and `refs/heads/agent-request/chatgpt`.
- Ruleset bypass actors: none.
- Wildcard exclusions are forbidden.

## Consequences

- Positive: branch ownership is deterministic and persistent.
- Positive: ChatGPT has a stable isolated remote workspace without turning the repository into a feature-branch model.
- Positive: branch leaks from tools or agents are rejected server-side.
- Negative: remote branch-per-agent parallelism is intentionally unavailable; parallel isolation must remain local until work is integrated into one of the two recognized refs.

## Source Map

- Local hook: `.githooks/pre-push.d/10-main-only`
- GitHub ruleset administration: `scripts/block-branch-creation.ts`
- Branch allowlist constant: `packages/local-agent-core/src/control-branch-namespaces.ts`
- Operational policy: [Scripts and Workflows](../../07-mobile-and-release/scripts-and-workflows.md)
- GitHub policy: [GitHub CI Policy](../../07-mobile-and-release/github-ci-policy.md)
- Local-agent operations: [Local Agent Runner Pool](../../07-mobile-and-release/local-agent-runner-pool.md)

## Change Impact

Any code or workflow that tries to create a third remote ref is incompatible with the repository contract and must be changed, disabled, or kept local-only.

## Invariants

1. Exactly two remote branches exist: `main` and `agent-request/chatgpt`.
2. Never create a third remote branch.
3. Never treat `agent-request/chatgpt` as temporary or delete it as request cleanup.
4. Production and releases come only from `main`.
5. ChatGPT uses `agent-request/chatgpt` for persistent isolated work.
"""


def update_docs() -> None:
    write("docs/01-architecture/09-decisions/ADR-0006-main-only-branch.md", ADR)

    path = "docs/01-architecture/09-decisions/README.md"
    text = read(path)
    text = text.replace(
        "| [ADR-0006](./ADR-0006-main-only-branch.md) | main is the only branch | Accepted |",
        "| [ADR-0006](./ADR-0006-main-only-branch.md) | Fixed two-branch repository model | Accepted |",
    )
    write(path, text)

    path = "docs/01-architecture/07-enforcement/enforcement-exceptions.md"
    text = read(path)
    text = text.replace(
        "Bypasses local pre-push hook (`10-main-only`) only — does not add GitHub required checks. Pushing to `main` stays unrestricted.",
        "Bypasses the local pre-push hook (`10-main-only`) only; it does not bypass the GitHub two-branch ruleset. The only recognized remote refs remain `main` and `agent-request/chatgpt`.",
    )
    write(path, text)

    path = "docs/07-mobile-and-release/scripts-and-workflows.md"
    text = read(path)
    replacement = """## Fixed two-branch repository model

The repository has exactly two recognized remote branches:

- `main` — production, release, and canonical integration.
- `agent-request/chatgpt` — the permanent ChatGPT/OpenAI working branch.

This is the normal branch model, not an exception. No third remote branch may be created. Former control-plane patterns such as `codex/**`, other `agent-request/**` refs, and `agent-control` are not permitted remote namespaces. Isolation for other agents must stay local (for example, local worktrees) until work is intentionally written to one of the two recognized branches.

`.githooks/pre-push.d/10-main-only` enforces the exact two-ref allowlist locally. The GitHub branch-creation ruleset enforces the same allowlist server-side with no wildcard exclusions and no bypass actors. Deletion of stray unauthorized branches remains possible for cleanup.

`agent-request/chatgpt` is persistent and must never be treated as a disposable gateway/request branch. ChatGPT prepares work there; production still comes only from `main`.

"""
    text, count = re.subn(r"## main is the only branch\n.*?(?=## The pre-push hook)", replacement, text, flags=re.S)
    if count != 1:
        raise RuntimeError(f"expected one old branch section in {path}, found {count}")
    text = text.replace(
        "pushes a `codex/agent-*` branch",
        "must not push a `codex/agent-*` branch; remote mutation is limited to `main` or `agent-request/chatgpt`",
    )
    text = text.replace(
        "republishes a sanitized snapshot to the output-only\n`agent-control` branch",
        "keeps coordination snapshots machine-local; the remote `agent-control` branch is forbidden",
    )
    text = re.sub(
        r"`local-agent-gateway\.yml` is the dispatch gateway for agents without\n`workflow_dispatch` API access:.*?Control-plane paths are excluded from `deploy-main\.yml`,",
        "`local-agent-gateway.yml` must not be used to create disposable request branches. The permanent `agent-request/chatgpt` ref is not a request branch and must never be deleted by gateway cleanup. Any gateway path that requires a third remote ref is disabled by the fixed two-branch policy.\n\nControl-plane paths are excluded from `deploy-main.yml`,",
        text,
        flags=re.S,
    )
    write(path, text)

    path = "docs/07-mobile-and-release/github-ci-policy.md"
    text = read(path)
    text = text.replace(
        "| Push to an `agent-request/**` branch | **Dispatch gateway workflow** (`.github/workflows/local-agent-gateway.yml`) |",
        "| Push to `agent-request/chatgpt` | Persistent ChatGPT workspace update; it is not a disposable gateway/request branch |",
    )
    text = re.sub(
        r"The mutation workflows run only on the `gova` self-hosted runner pool,.*?Secret-bearing project files are rejected by the apply script and again\nby the gateway\.",
        "Mutation workflows may still use local worktrees for isolation, but remote publication is constrained by the fixed two-branch contract. They may update `main` when explicitly operating in direct-main mode. They must not publish `codex/**`, temporary request refs, `agent-control`, or any other third branch. ChatGPT remote work belongs on `agent-request/chatgpt`. Secret-bearing project files remain rejected by the apply path.",
        text,
        flags=re.S,
    )
    text = re.sub(
        r"The coordination workflow is the shared identity, heartbeat, lock, and messaging\nsurface for cloud and local agents, and republishes a sanitized snapshot to the\noutput-only `agent-control` branch\.",
        "The coordination workflow remains the shared identity, heartbeat, lock, and messaging surface, but coordination state must remain machine-local or be represented without creating a remote `agent-control` branch.",
        text,
    )
    text = re.sub(
        r"The dispatch gateway is the one local workflow that reacts to a push, and only on\n`agent-request/\*\*` branches — never `main`\..*?See \[Local Agent Runner Pool\]\(\./local-agent-runner-pool\.md\)\.",
        "The former disposable `agent-request/**` gateway namespace is retired by the branch contract. `agent-request/chatgpt` is a permanent first-class branch, not a request branch, and must never be deleted after processing. No gateway operation may create or require a third remote ref. See [Local Agent Runner Pool](./local-agent-runner-pool.md).",
        text,
        flags=re.S,
    )
    text = text.replace(
        "- A `push` trigger on a local agent workflow other than the gateway, and any\n  gateway trigger on `main`",
        "- Any local-agent behavior that creates, updates, or depends on a remote branch other than `main` or `agent-request/chatgpt`",
    )
    text = re.sub(
        r"`main` remains the only branch\. The `main-only` ruleset \(if applied\) may block\n\*creation\* of other branches; it must exclude `refs/heads/main` so it cannot\ndelay or reject a push to `main`\. Local enforcement is `.githooks/pre-push.d/10-main-only`\.",
        "`main` and `agent-request/chatgpt` are the only recognized remote branches. The branch-creation ruleset applies to all refs and excludes exactly those two refs; wildcard exclusions are forbidden. Local enforcement is `.githooks/pre-push.d/10-main-only`.",
        text,
    )
    text = text.replace(
        "| `npm run github:block-branches` | Apply the `main-only` creation ruleset (does not constrain `main`) |",
        "| `npm run github:block-branches` | Apply the fixed two-branch creation ruleset; only `main` and `agent-request/chatgpt` are excluded from branch-creation blocking |",
    )
    write(path, text)

    path = "docs/07-mobile-and-release/local-agent-runner-pool.md"
    text = read(path)
    if "## Fixed Two-Branch Repository Model" not in text:
        block = """## Fixed Two-Branch Repository Model

Remote git state is intentionally limited to exactly two branches: `main` and `agent-request/chatgpt`. This is a first-class repository topology, not an exception. The runner pool may create local worktrees and local refs for isolation, but it must never publish a third remote branch. Former `codex/**`, disposable `agent-request/**`, and `agent-control` remote refs are forbidden.

`main` remains the direct-production integration branch. `agent-request/chatgpt` is the permanent ChatGPT workspace and must not be deleted by cleanup or gateway logic.

"""
        text = text.replace("## Where The Code Lives\n", block + "## Where The Code Lives\n", 1)
    text = text.replace(
        "| `local-agent-workspace.yml` | `workflow_dispatch` | isolated branch mutation (the default) |",
        "| `local-agent-workspace.yml` | `workflow_dispatch` | local isolation only; publishing a third remote branch is forbidden |",
    )
    text = text.replace(
        "| `local-agent-gateway.yml` | push to `agent-request/**` | dispatch gateway |",
        "| `local-agent-gateway.yml` | legacy branch gateway | must not create or delete remote branches under the fixed two-branch policy |",
    )
    mutation = """### Mutation

Remote branch-per-agent mutation is disabled by the fixed two-branch repository model. `local-agent-workspace.yml` may use local worktrees for isolation and verification, but it must not publish `codex/**` or any other third remote ref. `local-agent-main.yml` remains the serialized direct-`main` path. ChatGPT uses the persistent `agent-request/chatgpt` branch through the connected GitHub integration.

Local worktrees remain valid because they are machine-local implementation details, not GitHub branches. Parallel agents may isolate filesystem changes locally, but remote publication must converge onto one of the two recognized refs.

### Verification Choices"""
    text, count = re.subn(r"### Mutation\n.*?### Verification Choices", mutation, text, flags=re.S)
    if count != 1:
        raise RuntimeError(f"expected one mutation section in {path}, found {count}")
    dispatch = """## Dispatching From A Cloud Agent

Cloud agents must use an existing authorized channel. They may invoke supported `workflow_dispatch` operations or, for ChatGPT, commit work to the persistent `agent-request/chatgpt` branch. They must never create a temporary request branch.

The old pattern `agent-request/<request_id>` is retired because it would create a third remote branch. `agent-request/chatgpt` is not a disposable request ref and must never be deleted after processing. If a tool cannot operate without creating another remote branch, that mode is incompatible with this repository policy and must not be used.

## Agent Coordination"""
    text, count = re.subn(r"## Dispatching From A Cloud Agent\n.*?## Agent Coordination", dispatch, text, flags=re.S)
    if count != 1:
        raise RuntimeError(f"expected one dispatch section in {path}, found {count}")
    text = text.replace("the `agent-control`\nbranch", "machine-local coordination state; no remote `agent-control` branch")
    text = text.replace("the `agent-control` branch", "machine-local coordination state; no remote `agent-control` branch")
    write(path, text)

    branch_rule = """
## Fixed Two-Branch Repository Model

The repository has exactly two recognized remote branches: `main` and `agent-request/chatgpt`. This is the normal project topology, not an exception. `main` is the production/release branch; `agent-request/chatgpt` is the permanent ChatGPT working branch. Never create, push, request, or depend on any third remote branch, including feature branches, `codex/**`, other `agent-request/**` refs, `agent-control`, rescue branches, staging branches, or temporary branches. Local worktrees are allowed only when they do not create additional remote refs.
"""
    for path in ["AGENTS.md", "CLAUDE.md", "GEMINI.md", ".agents/rules/agent-instructions.md"]:
        text = read(path)
        if "## Fixed Two-Branch Repository Model" in text:
            continue
        marker = "<!-- BEGIN:nextjs-agent-rules -->"
        if marker in text:
            text = text.replace(marker, branch_rule + "\n" + marker, 1)
        elif "## Active MCP Servers & Skills Reference" in text:
            text = text.replace("## Active MCP Servers & Skills Reference", branch_rule + "\n## Active MCP Servers & Skills Reference", 1)
        else:
            text = text.rstrip() + "\n" + branch_rule + "\n"
        write(path, text)

    # Clean stale active wording across hand-authored docs without touching generated output.
    for path in (ROOT / "docs").rglob("*.md"):
        if "generated" in path.parts:
            continue
        text = path.read_text()
        text = text.replace("`main` is the sole branch", "`main` and `agent-request/chatgpt` are the sole recognized remote branches")
        text = text.replace("main is the sole branch", "`main` and `agent-request/chatgpt` are the sole recognized remote branches")
        text = text.replace("`main` remains the only branch", "`main` and `agent-request/chatgpt` remain the only recognized remote branches")
        path.write_text(text)


def update_enforcement_sources() -> None:
    write(
        "packages/local-agent-core/src/control-branch-namespaces.ts",
        """/**
 * The only non-main remote branch recognized by the repository.
 *
 * The exported name is retained for API compatibility with existing policy code,
 * but this is no longer a wildcard namespace list. Remote branch creation is
 * limited to `main` plus this exact ChatGPT branch.
 */
export const CONTROL_PLANE_BRANCH_NAMESPACES = [
  \"refs/heads/agent-request/chatgpt\",
] as const;
""",
    )

    path = "scripts/block-branch-creation.ts"
    text = read(path)
    text = text.replace(
        "Blocks branch creation on GitHub for every ref except `main`.",
        "Blocks branch creation on GitHub for every ref except the two recognized branches.",
    )
    text = text.replace(
        "const RULESET_NAME = 'main-only';",
        "const RULESET_NAME = 'fixed-two-branches';\nconst LEGACY_RULESET_NAME = 'main-only';",
    )
    text = text.replace(
        "return rulesets.find((ruleset) => ruleset.name === RULESET_NAME)?.id ?? null;",
        "return rulesets.find((ruleset) => ruleset.name === RULESET_NAME || ruleset.name === LEGACY_RULESET_NAME)?.id ?? null;",
    )
    text = text.replace(
        "/** Returns the id of the existing `main-only` ruleset, or null when there is none. */",
        "/** Returns the id of the fixed two-branch ruleset or its legacy main-only predecessor. */",
    )
    text = text.replace(
        "? '\\nNew branches can no longer be created on GitHub. main is the only branch.'",
        "? '\\nBranch creation is blocked for every ref except main and agent-request/chatgpt.'",
    )
    write(path, text)

    write(
        ".githooks/pre-push.d/10-main-only",
        """#!/bin/sh
# Enforces the repository's fixed two-branch remote model.
# Allowed remote refs:
#   refs/heads/main
#   refs/heads/agent-request/chatgpt
# Everything else is rejected. Deleting a stray unauthorized branch is allowed.

blocked=0

while read -r _local_ref local_sha remote_ref _remote_sha; do
  [ -n \"$remote_ref\" ] || continue

  case \"$local_sha\" in
    0000000000000000000000000000000000000000)
      case \"$remote_ref\" in
        refs/heads/main|refs/heads/agent-request/chatgpt)
          echo \"pre-push: refusing to delete recognized branch '$remote_ref'.\" >&2
          blocked=1
          ;;
        *) continue ;;
      esac
      continue
      ;;
  esac

  case \"$remote_ref\" in
    refs/heads/main|refs/heads/agent-request/chatgpt) continue ;;
  esac

  echo \"pre-push: refusing unauthorized remote branch '$remote_ref'.\" >&2
  blocked=1
done

if [ \"$blocked\" -ne 0 ]; then
  echo \"\" >&2
  echo \"This repository has exactly two remote branches: main and agent-request/chatgpt.\" >&2
  echo \"Do not create or push any third branch.\" >&2
  exit 1
fi

exit 0
""",
    )
    (ROOT / ".githooks/pre-push.d/10-main-only").chmod(0o755)


def read_admin_token() -> str:
    env = Path("/home/hesham/gova/.env.local")
    if not env.exists():
        raise RuntimeError(f"missing {env}")
    for line in env.read_text().splitlines():
        if line.startswith("GITHUB_ADMIN_TOKEN="):
            token = line.split("=", 1)[1].strip().strip('"').strip("'")
            if token:
                return token
    raise RuntimeError("GITHUB_ADMIN_TOKEN is missing")


def api_request(token: str, method: str, path: str, payload: dict | None = None):
    url = f"https://api.github.com/repos/printcode1000-lgtm/gova{path}"
    body = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    if body is not None:
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req) as response:
        raw = response.read()
    return json.loads(raw) if raw else None


def apply_ruleset() -> None:
    token = read_admin_token()
    rulesets = api_request(token, "GET", "/rulesets")
    existing = next((x for x in rulesets if x.get("name") in {"fixed-two-branches", "main-only"}), None)
    payload = {
        "name": "fixed-two-branches",
        "target": "branch",
        "enforcement": "active",
        "bypass_actors": [],
        "conditions": {"ref_name": {"include": ["~ALL"], "exclude": [MAIN_REF, CHATGPT_REF]}},
        "rules": [{"type": "creation"}],
    }
    if existing:
        saved = api_request(token, "PUT", f"/rulesets/{existing['id']}", payload)
    else:
        saved = api_request(token, "POST", "/rulesets", payload)
    excludes = saved.get("conditions", {}).get("ref_name", {}).get("exclude", [])
    if saved.get("name") != "fixed-two-branches" or saved.get("enforcement") != "active" or excludes != [MAIN_REF, CHATGPT_REF]:
        raise RuntimeError(f"ruleset verification failed: {saved}")
    print(f"Applied ruleset {saved['id']} with exact exclusions: {excludes}")


def commit_and_push() -> None:
    workflow = ".github/workflows/two-branch-policy-migration.yml"
    script = ".github/two_branch_policy_migration.py"
    run("git", "config", "user.name", "printcode1000-lgtm")
    run("git", "config", "user.email", "print.code.1000@gmail.com")
    run("git", "rm", workflow, script)
    run("git", "add", "AGENTS.md", "CLAUDE.md", "GEMINI.md", ".agents/rules/agent-instructions.md", "docs", ".githooks/pre-push.d/10-main-only", "scripts/block-branch-creation.ts", "packages/local-agent-core/src/control-branch-namespaces.ts")
    run("git", "commit", "-m", "docs: enforce fixed two-branch repository model [docs-contract-change]")
    run("git", "push", "origin", f"HEAD:{CHATGPT_BRANCH}")


if __name__ == "__main__":
    update_docs()
    update_enforcement_sources()
    apply_ruleset()
    commit_and_push()
