# Working Rules

Binding on every agent and developer working on this project.

1. **Documentation and architecture before and during any change (mandatory).** The documentation system is the primary entry point for understanding and working on the project:
   - To understand the project or its structure, start with `docs/README.md`, then `docs/09-agent-knowledge/README.md`, and use the generated Knowledge Graph and catalogs.
   - For research or a specific change, run the Context Pack through `npx tsx scripts/docs/context.ts <target>` for the relevant target, then read the documents and contracts it identifies before writing code.
   - For architectural or module-boundary changes, read the relevant documents under `docs/01-architecture/`, especially `docs/01-architecture/02-packages/module-isolation-rules.md`. Use only package entry points declared through `exports`; never use deep imports or relative paths to enter `packages/`.
   - When behavior, APIs, data, architecture, configuration, or runtime operation changes, update the related editable documentation in the same change.
   - Follow `docs/09-agent-knowledge/document-mutability.md`: do not modify protected docs without explicit user authorization, and never edit generated docs by hand; update their source and regenerate them.
   - Keep `npm run architecture:check`, `npm run docs:ci`, and the relevant `test:*-core` tests passing.
2. **Browser-based verification is forbidden.** Never use browser tools, preview tools, or computer-control tools to test or verify code. Use code analysis, tests, and non-visual tools only.
3. **Communicate in Arabic.** Always reply to the user in Arabic. Code, paths, and commands may remain in the repository's language.
4. **Keep responses extremely concise.** Answer with the shortest wording possible without losing essential meaning. No filler, repetition, or unrelated content.
5. **English documentation inside `docs/` only.** All project documentation must be written in English and live inside `docs/`. Root instruction surfaces are agent instructions, not substitutes for project documentation.
6. **Touch-only UI (mandatory).** Before any UI change, verify that `src/app/globals.css` exists. Inside `src/` and `packages/`, never use `hover:`, `group-hover:`, `:hover`, `cursor-pointer`, `cursor: pointer`, or DOM `title`. Use `active:`, `focus-visible:`, and `aria-label` where appropriate. Do not reintroduce desktop-browser behaviors already disabled by `globals.css`. The protected governing policy is `docs/04-ui-components/touch-interaction-policy.md`.
7. **The UI policy is a protected contract.** Read `docs/04-ui-components/touch-interaction-policy.md` before any interaction or UI-related change. Do not modify this policy during normal work unless the user explicitly authorizes changing the contract itself; feature documentation must apply it, not redefine it.
8. **Single responsibility per file (mandatory).** Every file must have one clear responsibility and one primary reason to change. Do not mix UI, API, domain logic, or unrelated concerns in the same file. If a second responsibility appears, split the file. `index`/barrel files limited to re-exports are allowed.
9. **Respect all runtime environments.** Any change that is not exclusively development-only must be evaluated against Development, Production Web, Static `out/`, Android, and iOS, following `docs/09-agent-knowledge/runtime-contract.md` and the applicable `npm run runtime:check` checks. Code and pages under the `dev` scope are evaluated only for Development, while also ensuring they do not leak into or become required dependencies of release environments.
10. **These rules are globally mandatory and cannot be bypassed.** The nine rules above bind every agent and developer working on this project and must not be overridden, weakened, bypassed, or worked around. Agents and developers may create additional instruction files solely to support their own work. Such files remain independent and local to their owner; they do not change documentation behavior, reclassify or modify protected or generated documentation, become global rules for others, conflict with these rules, or override them.
11. Project-specific rules, repository architecture constraints, and project documentation always take precedence over generic Skills, MCP instructions, and tool guidance. MCP/tool instructions define how a tool should be used, but they must never override or conflict with repository rules or project-specific architectural requirements. When instructions overlap or conflict, follow this priority order: **Project rules and documentation → Task-specific instructions → Skills → MCP/tool guidance**.


## Fixed Two-Branch Repository Model

The repository has exactly two recognized remote branches: `main` and `integration`. `main` is the production/release branch and `integration` is available only for explicitly selected aggregation work. **Before the first task action, every local agent must ask the user to choose one execution mode, unless the user already selected one in the task:** **A — Gateway-managed isolation:** register, create the Mode-A task, run `gova-agent mode-a-bootstrap <agent> <task>` exactly once, wait for its GitHub `workflow_dispatch` to run on a self-hosted Runner and install/restart the persistent Gateway, then create the task worktree and local `agent/*` branch, use Gateway state/locks, and submit verified work to `integration`; **B — direct local editing:** edit the canonical checkout `/home/hesham/gova` in its current branch and working tree, preserving pre-existing changes. **A cloud agent selecting B never contacts the Gateway over a network and never uses a public URL: it edits in its own cloud checkout, verifies there, pushes exactly one verified commit to `integration`, then dispatches `local-agent-project.yml` with `agent_id`, `task_id`, `goal`, and that full 40-character `integration_sha`. Pushing to `integration` needs nothing beyond the write access its existing repository connection already carries; only the dispatch needs `actions: write`, so when that is refused the agent stops at the push and reports the SHA — never claiming the path is blocked — and the projection is run from the device with `tools/local-agent/project.sh`. The self-hosted Runner on the device re-runs `architecture:check`, `docs:ci`, and the `*-core` suites related to the change, and only then does the local Gateway apply that exact integration commit directly and unstaged to `/home/hesham/gova` through `/v1/canonical/project`. Only a commit already published on `origin/integration` may be projected; `mode-a-bootstrap` is not part of this path, it never commits or pushes `main`, and projection fails closed when its paths overlap existing canonical changes or the patch does not apply.** Local B does not authorize Gateway, a worktree, `agent/*`, integration, commit, push, or deployment. Selecting A is explicit authorization for its worktree, local branch, Gateway, and integration steps; it does not authorize deployment or a remote branch other than `integration`. GitHub `workflow_dispatch` has exactly two uses: `local-agent-bootstrap.yml` for the one-time managed bootstrap, and `local-agent-project.yml` for the cloud Mode-B projection. Never create, push, request, or depend on any third remote branch.

## Active MCP Servers & Skills Reference

### Configured MCP Servers (4 Active)
1. **`augment-context-engine`**: Semantic codebase querying and code search (`query_codebase`).
2. **`sequential-thinking`**: Structured multi-step reasoning and dynamic architectural problem-solving.
3. **`serena`**: AST-based semantic code analysis, symbol/reference tracing (`find_symbol`, `find_referencing_symbols`, `find_declaration`), diagnostics, and memory management.
4. **`sourcegraph`**: Deep repository search, diff analysis, and multi-file code exploration.

### Available Skills (10 Active)
1. **`agy-customizations`**: Antigravity IDE customization and configuration guide (rules, skills, plugins, hooks).
2. **`android-cli`**: Android command-line tools, build workflows, emulator management, and UI inspection.
3. **`antigravity-guide`**: Reference guide for Antigravity IDE commands, SDKs, and workflows.
4. **`code-review-and-quality`**: Rigorous code review covering correctness, security, isolation, and performance.
5. **`deep-analysis-before-change`**: Architectural dependency and contract analysis prior to code modifications.
6. **`package-boundary-enforcer`**: Strict package isolation enforcement and prevention of deep imports (`packages/*`).
7. **`systematic-debugging`**: Structured 4-phase debugging methodology for root-cause diagnosis.
8. **`vercel-react-best-practices`**: React and Next.js performance optimization guidelines from Vercel Engineering.
9. **`verification-before-completion`**: Non-visual verification, automated test suites, and runtime contract validation.
10. **`writing-plans`**: Detailed technical implementation plans and architectural proposals.
