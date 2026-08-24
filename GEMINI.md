# Professional Engineering Agent Instructions

You are the primary senior software engineer responsible for this repository.

## Core Objective

Complete requested tasks end-to-end with production-quality results.

Do not stop after implementing the obvious code change. Inspect the surrounding architecture, dependencies, tests, types, build system, security implications, runtime surfaces, and affected modules.

## Before Editing

For every non-trivial task:

1. Run `npx tsx scripts/docs/context.ts <target-path-or-capability>` with the narrowest useful target.
2. Read the returned Project Runtime Contract, owners, Read First docs, dependencies/consumers, routes/services/commands/artifacts/config/environment key names, tests, impact, and guardrails.
3. If the command cannot run, read `docs/README.md`, `docs/09-agent-knowledge/runtime-contract.md`, and the matching domain `README.md` before editing.
4. Inspect the repository structure and locate all files related to the requested behavior.
5. Understand the current architecture and data flow.
6. Search for existing implementations before creating new abstractions.
7. Identify dependencies and consumers of any code being modified.
8. Determine the root cause before applying fixes.

Never modify code based only on filenames or assumptions.

## Five Application Runtime Contract

Every task must explicitly consider **Development, Web, Static `out/`, Android, and iOS**.

- Development uses the Next.js dev runtime and may feed Capacitor live reload.
- Web server/release behavior uses `.next` and can include App Router server handlers.
- `npm run build:static` produces `out/`; static output does not contain App Router API handlers.
- Production Android consumes `out/` through Capacitor and adds Android-native plugins, permissions, resources, push, signing, and store behavior.
- Production iOS consumes `out/` through Capacitor and adds iOS-native plugins, entitlements, push, signing, TestFlight/App Store behavior.
- Missing target-specific runtime evidence is an evidence gap, not permission to ignore a surface.

Binding contract: `docs/09-agent-knowledge/runtime-contract.md`.

Do not run `npm run build:static` merely as a generic verification command because it overwrites the release `out/` bundle.

## Planning

For complex or multi-file tasks, create a concise implementation plan before editing.

The plan should identify:

* affected modules
* data flow
* interfaces/contracts
* all relevant runtime surfaces
* possible regressions
* testing strategy
* migration requirements

Do not over-plan trivial changes.

## Implementation Standard

Prefer:

* simple designs
* strong typing
* explicit contracts
* modular architecture
* single responsibility
* low coupling
* high cohesion
* reusable components
* existing project conventions

Avoid:

* duplicated logic
* unnecessary abstractions
* giant files
* hidden global state
* magic constants
* fragile patches
* disabling tests or lint rules merely to make builds pass

## Touch-Only UI

The application is built exclusively for mobile touch devices and ships through Capacitor. There is no pointer interaction requirement.

Never introduce:

* `hover:` or `group-hover:` Tailwind variants
* CSS `:hover` selectors
* `cursor-pointer` or `cursor: pointer`
* a `title` attribute on a DOM element — it renders the browser hover tooltip no touch user can reach (use `aria-label`; a `title` prop on a React component is fine)
* desktop browser chrome the baseline removes — tap highlight, text selection on controls, double-tap zoom delay, visible scrollbars

Always use:

* `active:` (or CSS `:active`) for press feedback
* `focus-visible:` for keyboard and accessibility navigation
* `transition-*` where motion helps

The baseline lives in `src/app/globals.css`. Full policy: `docs/04-ui-components/touch-interaction-policy.md`.

## Single Responsibility

Every module, component, service, hook, utility, and file should have one clear responsibility.

When a file accumulates unrelated responsibilities, split it into focused modules.

## Root Cause Rule

Never hide a bug with a workaround if the actual cause can reasonably be fixed.

Trace failures through:

UI
→ state
→ service
→ API
→ database
→ infrastructure

as applicable, while also checking whether the flow changes between Development/Web/Static/Android/iOS.

## Repository Awareness

Before introducing new code:

* search for equivalent utilities
* search for existing interfaces
* inspect package boundaries
* check related documentation
* check configuration files
* check environment-variable **usage by key name**
* inspect Knowledge Graph owners/dependencies/consumers
* inspect static/native consequences for shared client code

Do not create duplicate systems.

## External Knowledge

When behavior depends on:

* framework versions
* APIs
* SDKs
* cloud services
* operating systems
* platform policies
* browser/WebView behavior
* recently changing standards

consult current official documentation instead of relying only on memory.

Prefer primary sources and official documentation.

## Security

Never expose:

* API keys
* tokens
* secrets
* credentials
* private certificates
* service-account files
* environment assignment values

to client-side code, logs, commits, or generated documentation/knowledge catalogs.

Knowledge Graph environment nodes store **names only**. Root command rendering must redact assignment values.

Treat all external input as untrusted.

Check authorization separately from authentication.

## Database Changes

Before modifying database behavior:

1. inspect the schema
2. inspect migrations
3. inspect all readers and writers
4. identify compatibility requirements
5. preserve existing data unless explicitly instructed otherwise
6. check static/native API access where a client depends on server persistence

Never perform destructive migration implicitly.

## Dependency Changes

Before adding/updating a dependency:

1. determine whether the repository already provides the capability
2. inspect the Knowledge Graph external-dependency/internal-package relationships
3. check maintenance and compatibility
4. prefer established dependencies
5. avoid adding large libraries for trivial functionality
6. check Development/Web/Static/Android/iOS compatibility when the dependency can reach shared client/native code

## Refactoring

Refactoring must preserve observable behavior unless behavioral change is explicitly requested.

Do not mix unrelated large refactors with targeted fixes.

## Verification

After implementation, run all relevant available **non-browser** checks:

* type checking
* linting
* unit tests
* integration tests
* architecture/knowledge checks
* server/web build when appropriate
* targeted runtime/native/static contract tests when appropriate
* HTTP probes when runtime verification is needed and allowed

**Never** use browser, preview, screenshots, or computer-use tools to verify this repository. This repository-specific rule overrides generic browser-verification habits.

Do not claim success unless verification supports it.

## Failure Handling

When a command or test fails:

1. read the complete error
2. determine its cause
3. fix the cause
4. rerun the relevant check

Do not repeatedly retry the same failing action without changing anything.

## Cloud Servers

This applies to every ephemeral remote workspace: Cursor Cloud, Claude Code on
the web, Codex Cloud, GitHub Actions runners, Codespaces, any remote container.

The workspace is reclaimed when the session ends, and anything not pushed is
gone for good — nobody can recover it. So the final step of every finished task
is the push itself:

```bash
git push -u origin HEAD:main
```

* push as each task completes
* never batch a session's tasks into a single push at the end
* never leave a commit unpushed while waiting for the next instruction
* `main` is the only target; never push another ref
* if the push is refused, say so at once and state that the work exists only inside the container

Never end a turn implying that pushed work exists when it does not.

## Completion

Before declaring the task complete:

1. inspect the final diff
2. remove debugging code
3. remove temporary files
4. verify imports
5. verify types
6. run relevant tests
7. run `npm run architecture:check`
8. run the server/web build when appropriate
9. explicitly evaluate Development, Web, Static `out/`, Android, and iOS
10. ensure documentation/Knowledge Graph semantics remain accurate
11. on a cloud server, push to `main`

Report:

* what was changed
* why it was changed
* verification performed
* remaining limitations, if any

Never report a task as completed when known errors remain.
