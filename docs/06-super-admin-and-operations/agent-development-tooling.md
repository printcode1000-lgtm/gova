# Agent Development Tooling

## Purpose

Gova agents have a shared development toolbox for repository discovery, structural and semantic analysis, browser verification, static analysis, shell/workflow checks, and external-service operations. The policy applies to execution Modes A, B, and C; the selected mode still decides where commands are allowed to execute.

Remote Desktop Commander is the Mode-C transport. It is not one of the numbered code-analysis tools below. On the Desktop host, user-level binaries live primarily in `~/.local/bin`; project-local dependencies and npm scripts take precedence when a repository-specific version exists.

## Baseline Search: ripgrep (`rg`)

`rg` is the default textual repository search tool. Prefer it over `grep` for source, documentation, configuration, logs, identifiers, routes, environment-key names, and exact error text because it is fast, recursive, and repository-ignore aware.

Use structural or semantic tools instead when the question is about syntax, symbols, references, types, or dependency relationships rather than literal text.

## Eight Development Tool Groups

### 1. ast-grep

Use `ast-grep` for syntax-aware structural search, lint-style rules, and controlled rewrites. Prefer it over text replacement when a change depends on AST shape. Rewrites must be reviewed with Git diff and project checks before completion.

### 2. TypeScript semantic tooling

Use project `typescript`/`tsc` plus `typescript-language-server` for type-aware diagnosis, definitions, references, imports, and semantic relationships. Repository-local TypeScript remains authoritative over a global copy.
### 3. Playwright browser tooling

Use `playwright-cli` for direct browser evidence when a change affects UI, navigation, rendering, browser APIs, client-side state, network behavior, or runtime interaction. Browser verification is allowed and encouraged when it materially improves confidence; it supplements rather than replaces automated checks.

The Desktop host has the Playwright CLI, Chromium, Chromium Headless Shell, FFmpeg, and the global Playwright agent skill installed. Browser binaries are stored under `~/.cache/ms-playwright`, and the shared skill is under `~/.agents/skills/playwright-cli`.

### 4. Knip

Use `knip` to report unused files, exports, dependencies, and dependency-graph inconsistencies. Treat Knip as report-first: do not bulk-delete or auto-fix findings without confirming ownership, runtime reachability, generated sources, and package boundaries.

### 5. Static analysis: Semgrep + ESLint/Biome

Use `semgrep` for repository-wide rule/pattern analysis, the repository's local `eslint` for project lint rules, and `biome` as an additional fast analyzer/formatter when appropriate. Never replace the repository's configured lint gate with a global tool version.

### 6. Navigation and diff helpers

Use `fd` for file discovery, `fzf` for interactive narrowing, `bat` for readable source inspection, and `delta` for clearer Git diffs. These tools improve investigation speed but do not change repository policy or verification requirements.

### 7. Shell and GitHub Actions validation

Use `shellcheck` for shell diagnostics, `shfmt` for shell formatting, and `actionlint` for GitHub Actions workflow validation. Run them on touched scripts/workflows before relying on deployment or automation behavior.
### 8. GitHub, Vercel, and Turso CLIs

Use `gh`, `vercel`, and `turso` for authorized repository, deployment, and database operations. Tool availability does not imply permission: commit, push, deployment, destructive database changes, or credential mutation still require the task/user authorization defined elsewhere.

## Mode A / B / C Usage

- **Mode A:** use this toolbox inside the Gateway-managed host/worktree path. Host user-level tools may be used alongside project-local tools.
- **Mode B, local:** use the same toolbox directly in the canonical checkout while preserving pre-existing changes.
- **Mode B, cloud:** the same tooling policy applies, but commands run only in the cloud checkout. Use project-local or equivalent cloud-installed tools there; do not switch transport or reach the Desktop merely to obtain a host binary.
- **Mode C:** every toolbox invocation, including Playwright/browser automation and cloud CLI operations, must be launched on the paired device through Remote Desktop Commander. Browser automation started by a Remote Desktop Commander terminal command remains a Mode-C operation.

## Recommended Investigation Order

1. `rg` / `fd` to locate text and files.
2. `ast-grep` for syntax-shaped searches or rewrites.
3. TypeScript semantic tooling for symbols, types, imports, and references.
4. Knip/Semgrep/ESLint/Biome for dependency and static-analysis evidence.
5. Targeted tests plus shell/workflow validators for changed automation.
6. Playwright when direct browser evidence is relevant.
7. Git diff, architecture/runtime/documentation checks, and the applicable project release gates.

No single tool is a completion certificate. Use the smallest combination that directly tests the risk introduced by the change, and preserve the project's five-runtime compatibility contract.

## Live Account Simulation

The development runtime includes a multi-origin live-account simulation system. `npm run dev` keeps ordinary development on port `3001` and starts the internal Next.js runtime plus actor gateway. Simulation Mode is OFF by default and is controlled by the Super Admin switch in `ASOL DEV`.

Actor ports are `3002` through `3011`; each port is a distinct browser origin so IndexedDB/AsolDB, query persistence, storage, Service Workers, Web Push, and BroadcastChannel remain isolated. Do not replace this with client-side UID switching or shared-origin storage namespacing.

Use `npm run dev:simulation:smoke` after gateway changes. For a cable-connected Android device, use `npm run dev:simulation:adb` to reverse `3001` through `3011`; use `npm run dev:simulation:adb:remove` to remove those mappings. The no-Wi-Fi/hotspot development workflow remains supported.

Simulation credentials are server-only `.env.local` values. Agents must never print or copy `SIM_*_PASSWORD` values into prompts, logs, commits, or documentation. See `simulation-users.md` for the actor registry and runtime behavior.
