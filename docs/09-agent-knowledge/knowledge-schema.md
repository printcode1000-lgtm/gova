# Knowledge Schema

## Purpose

Knowledge Graph v2 provides stable vocabulary for relationships an agent needs during change-impact analysis. It is deterministic, serializable as JSON, safe to build from a fresh checkout, and explicitly models runtime/build topology rather than treating the repository as a flat code tree.

## Node Model

Every node has:

| Field | Meaning |
|---|---|
| `id` | Stable identity such as `package:@asol/data-core`, `external-dependency:@capacitor/core`, `runtime:android`, or `environment-key:NEXT_PUBLIC_ASOL_API_BASE_URL` |
| `kind` | Typed class listed below |
| `name` | Human/searchable display name |
| `path` | Repository-relative path when the object has a stable path; generated artifacts may have a logical path such as `out` or no path |
| `summary` | Short derived/intentional description where available |
| `tags` | Search terms derived without secret values |

### Node kinds

| Kind | Meaning |
|---|---|
| `domain` | Documentation domain from `domain-registry.json` |
| `document` | Markdown knowledge document |
| `package` | Sealed/internal package from `packages/*` |
| `external-dependency` | External npm dependency declared or imported by repository code |
| `feature` | Application feature under `src/features/*` |
| `service` | Independently deployed service under `services/*` |
| `route` | App Router page or request handler |
| `source` | Production source, including tracked Android/iOS/Fastlane text source |
| `script` | Repository tooling source under `scripts/` |
| `test` | Test/spec source |
| `config` | High-value root/native/runtime configuration |
| `command` | Root `npm run <name>` script |
| `environment-key` | Environment variable **name only** discovered from `.env.example`, code, or command assignments |
| `runtime` | Development, Web, Static `out/`, Android, iOS, independent services, or tooling |
| `artifact` | Build/release output such as `.next`, `out/`, Android package, or iOS archive |

## Edge Model

Every edge is directional and typed:

| Edge | Meaning |
|---|---|
| `contains` | A container/route/domain includes another object |
| `imports` | A source imports another known source/package/external dependency, or an owner-level dependency is aggregated from live imports |
| `declares-dependency` | `package.json` or package manifest declares an internal package or external npm dependency |
| `belongs-to` | Source/test/document belongs to a feature/package/service/domain |
| `references` | A document links or mentions another known repository object |
| `documents` | A documentation domain/document intentionally covers a repository object/runtime/artifact |
| `tests` | A test verifies its owner or an imported target |
| `related-to` | Intentional weaker relationship, including route-to-owner dependency projection |
| `affects-runtime` | Source/route/config has direct evidence of impact on a runtime surface |
| `targets-runtime` | Command operates on/builds/runs a runtime |
| `produces` | Command creates a build/release artifact |
| `consumes` | Runtime consumes an artifact |
| `invokes` | Command invokes another root command or a known source script |
| `configured-by` | Runtime is controlled by a config node |
| `uses-environment` | Source/command reads or assigns an environment key name |

Edges may carry `detail` such as an import specifier, dependency field/range, documentation prefix, or relationship rationale. Environment values must never appear in edge details.

## Mandatory Runtime Nodes

These five IDs are binding and must always exist:

```text
runtime:development
runtime:web
runtime:static-out
runtime:android
runtime:ios
```

Additional `runtime:services` and `runtime:tooling` nodes model execution contexts outside the five application surfaces.

The graph contract requires `artifact:static-out` to be produced by `npm run build:static` and consumed by Static `out/`, Android, and iOS; `artifact:next-server-build` must be consumed by Web.

## Identity Rules

- Paths are normalized to `/` on every platform.
- Collections are sorted before rendering.
- Generated artifacts contain no wall-clock timestamps.
- A package node uses its npm package name.
- External dependency nodes use the npm package name and never represent internal `@asol/*` packages.
- Routes derive from App Router page/route files; route groups `(group)` and parallel slots `@slot` are removed from URL identity.
- Server route handlers must not receive Static/Android/iOS runtime edges because they are absent from `out/`.
- Environment-key nodes store names only and validate against `^[A-Z][A-Z0-9_]*$`.
- Root command nodes store command identity; generated operational text redacts environment assignment values.

## Owner-Level Dependency Projection

File-level imports are not enough for an agent changing an entire capability. When a source owned by package/feature/service A imports a target owned by B, the graph adds an aggregate owner `imports` edge A → B. External npm imports also project to owner → external-dependency edges. This supports direct upstream/downstream impact analysis without flooding Context Packs with every implementation file.

## Native Source Coverage

The scanner indexes relevant tracked text source/config from `android/`, `ios/`, and `fastlane/` in addition to `src/`, `packages/`, `services/`, and `scripts/`. Generated native build directories remain excluded. Android/iOS sources receive explicit runtime edges.

## Graph Traversal for Context Packs

Context generation starts with exact/high-confidence seeds, resolves owners, then expands a bounded structural neighborhood through ownership/import/test/containment/invocation relationships. High-cardinality global runtime/domain relationships are **not** used as traversal hubs; they are added as contextual evidence after structural expansion.

```text
target
  -> owner / belongs-to
  <-> owner/source imports
  -> tests / routes / services
  <-> commands invoked by or invoking the scope
  -> environment keys / configs / artifacts
  -> direct runtime evidence
  -> ranked docs/domains
  + ALWAYS include the five-runtime project contract
```

This provides high impact coverage without turning every shared runtime node into a path to the whole repository.

## Validation

`scripts/docs/check.ts` validates node/edge classes, dangling edges, five runtime nodes, artifact topology, native mappings, route/static exclusions, documentation-domain assignment, owner-level dependency presence, owner-to-external dependency presence, agent instruction parity, Context Pack runtime visibility, and command-value redaction.

The TypeScript interfaces live in `scripts/docs/model.ts`; runtime/artifact definitions live in `scripts/docs/runtime-knowledge.ts`; graph construction lives in `scripts/docs/repository-knowledge.ts`.
