# The 2026-08 consolidation

One change, eight new sealed packages, and a set of moves that put every scattered concern behind
a single owner. This page is the map: what moved, where it went, and — for each case — the reason
the old arrangement was a problem rather than merely untidy.

Read [module-isolation-rules.md](./module-isolation-rules.md) first. Everything below is held to
the same eight rules, and every new package carries a `test:*-core` gate that runs in `build`,
`build:static`, `test`, and the required `verify` check in CI.

---

## The eight new packages

| Package | Layer | Doors | Gate | What it ended |
| :-- | :-- | :-- | :-- | :-- |
| `@asol/format-core` | 1 | `.` | `test:format-core` | Money, dates and counts formatted in ~25 files, in three different spellings of the same currency |
| `@asol/signed-token-core` | 1 | `.` | `test:signed-token-core` | The signed-envelope algorithm implemented four times |
| `@asol/service-runtime-core` | 1 | `.` | `test:service-runtime-core` | Five hand-copied HTTP helper files and six hand-copied health routes across the service mirrors |
| `@asol/architecture-core` | 1 | `.` | `test:architecture-core` | The architecture rules living in `src/` while their enforcement lived in `scripts/`, joined by relative imports |
| `@asol/observability-core` | 1 | `.` · `./dev-trace` · `./server` | `test:observability-core` | The developer monitor as 14 unsealed files in `src/core/monitor/` |
| `@asol/env-core` | 1 | `.` · `./files` | `test:env-core` | Four spellings of "read this environment variable", and two copies of the `.env` parser |
| `@asol/release-core` | 1 | `.` | `test:release-core` | The release pipeline in `scripts/lib/`, outside every package gate |
| `@asol/secrets-core` | 1 | `.` | `test:secrets-core` | 600 lines of archive encryption sitting beside the deploy helpers |

### `@asol/format-core`

Twenty-five files decided for themselves what Arabic maps to (`ar-EG`), what English maps to
(`en-EG` in some places, `en-US` in others), and whether money is `Intl` currency style or a
hand-written `ج.م` suffix. Three renderings of one currency were in production side by side.

The package holds the rules and nothing else: no data access, no dependencies, browser-safe, so
the hosted app and every service deployment can reach it. `formatDateTimeDefault` exists as its own
function because the admin tables were written against `Date.prototype.toLocaleString` with no
options, and `dateStyle: 'medium'` is a visibly different string — naming it stops the two from
being merged by someone who assumes they are the same call.

### `@asol/signed-token-core`

`base64url(payload).base64url(HMAC-SHA256(payload))` existed four times: the session token, the
notification grant, the specialty-chat capability, and the password-recovery digests. They agreed
by accident. The parts that are easy to get subtly wrong — constant-time comparison, treating a
length mismatch as a mismatch rather than letting `timingSafeEqual` throw, refusing an expired
payload *after* verifying the signature and never before — were re-derived each time.

The package owns signing; each caller keeps what its token *means*: how long a session lasts, what
a grant authorises, which claims make a capability usable. The secret is a callback, never an
import, so the package stays free of every configuration module.

### `@asol/service-runtime-core`

The six service mirrors are separate Next.js projects that share no application code by design.
What they were sharing anyway was five copies of `src/app/lib/http.ts` and six health routes, each
drifting from the main application in its own direction — the comments in those files say outright
that they "mirror" `mapOrderError` by eye.

The package holds the mechanism: CORS headers, the error-message fallback, and the order rules are
applied in. Each deployment keeps its policy — which methods it answers, which codes it can raise,
which shards it needs — because those genuinely differ. A read-only deployment advertising `POST`
would be describing a route it does not have.

### `@asol/architecture-core`

The contract lived in `src/core/architecture/`, the scan in `scripts/architecture-check/`, and the
scan reached across with `../../src/...`. The tooling that enforces rule 5 was the clearest example
of what rule 5 forbids. Both halves are now one package; `scripts/architecture-check.ts` is a CLI
that supplies the two preflight validations needing the application itself.

Two things were found while moving it: a dead check that nothing had run since it was written
(`native-core-contract.ts`, which would have flagged the declared `@asol/native-core/scripts/...`
door as a violation), and a `process.env` allowlist entry naming a file deleted long ago. Both are
gone, and the package's contract test now fails when either shape returns.

### `@asol/observability-core`

`@asol/data-core` already announced its queries through a port; the recording half stayed in the
application as 14 unsealed files. Sealing it puts both halves of one concern behind one door and
turns the single thing it needs from the application — "is this a development build?" — into an
explicit port, registered from the composition roots.

Its three doors are the clearest example in this repository of a door being a **load-time
contract** rather than a convenience: `src/core/api/api-response.ts` needs the trace header name
and is mirrored into all six deployments. Reaching it through the main door pulled the monitor
store and `@asol/data-core/browser` into every one of them — which it did, until `./dev-trace`
existed. `./server` likewise excludes `emit-server-trace`, which is browser-side and drags the
store with it.

### `@asol/env-core`

Key ownership did not move: `@asol/account-declarations` still owns deployment keys and each
capability package still reads its own credentials. What moved is duller and was genuinely
duplicated — whether an empty string counts as absent, whether values are trimmed, what a missing
required key throws, and which of two legacy spellings wins.

The rule the package exists to hold: **blank is absent**. A key set to `""` is unconfigured, which
is what a partially provisioned deployment actually looks like.

### `@asol/release-core` and `@asol/secrets-core`

`deploy:all` pushes directly to `main` and is the only supported release path, which makes its
phase order, its resume state and its child-process handling the most consequential code here. It
sat in `scripts/lib/`, gated by nothing, beside a `vercel-deployment-monitor.ts` that only
re-exported `@asol/vercel-deploy-core` — a second name for a door that already existed.

The same argument applies twice over to the secret archive: code that loses a project's
credentials if it is wrong belongs behind a contract test. `release-core`'s test pins the phase
**order** literally, because every derived property would still hold under a reordering that
published before preflight.

---

## Moves that did not need a package

| What | From | To | Why |
| :-- | :-- | :-- | :-- |
| Business-API tracing wrapper | `src/app/api/auth/traced-route.ts` | `src/core/api/traced-route.ts` | 85 routes imported it through `../../auth/`, `../../../auth/`, `../../../../auth/` — a cross-cutting concern addressed by counting directories |
| Port registration | 8 scattered call sites | `src/core/composition/` | See [Composition roots](#composition-roots) |
| Order action orchestration | a 678-line route handler | `src/features/orders/application/` | Building four actor identities and dispatching forty actions is not HTTP |
| `moneyMinor` | `src/app/api/orders/order-api-helpers.ts` | `@asol/orders-core` | What a valid amount *is* has always been the domain's answer; the application had to import from `src/app/api/**` to price anything |
| `authPhoneCandidates` | `src/features/auth/utils/` | `@asol/auth-core/server` | Real logic behind a `@deprecated` re-export shim |
| `storage-profiles.json` | `src/config/` + two committed copies in `services/` | `@asol/storage-core/src/config/` | Read through `process.cwd()`, so the package only loaded where the repository was checked out; the copies were kept in step by hand |
| Domain presentation | `src/components/<domain>/` | `src/features/<domain>/presentation/` | Logic and its UI were in two trees, and only for *some* features |
| `src/lib` odds and ends | `images/`, `initialization/`, `storage/`, `seller/`, `order-data-refresh` | the features that own them | A junk drawer named after a folder, not a concern |
| Development guards | three modules, three answers | `src/core/config/development-guard.server.ts` | "Is this a developer machine?" had a plain answer, a strict answer, and a hand-rolled third one. A tool that deletes rows and a tool that lists them must not disagree |
| `src/components/merchant` + `src/lib/merchant` | — | deleted | ~2,400 lines with no reference anywhere in `src/`, `packages/`, `services/` or `scripts/`; English-only copy and Pexels placeholder data |

### Composition roots

Every port a sealed package names is now registered from one of two roots:

- `src/core/composition/browser-ports.ts` — OTA, system logs, observability.
- `src/core/composition/server-ports.ts` — storage profile validation, data-core telemetry,
  orders identity, system logs, OTA server half, observability. Called once from
  `src/instrumentation.ts`.

The seams themselves stay separately importable on purpose: the service mirrors are built by
walking the module graph, and an account may not reach a capability it holds no credential for.
The server root is where they all run *in the application*, not a barrel for routes to import.

`src/core/composition/tests/ports-registry.test.ts` scans `src/` for any module calling a
`configure*Core(...)` and fails when a root does not call it. Every one of these ports defaults
safely — telemetry no-ops, identity predicates fail closed — which is exactly why a forgotten
registration is invisible, and why the check is mechanical rather than conventional. It has
happened before: the OTA ports stayed at their defaults through the whole splash because the
component that registered them had not mounted yet.

---

## Request shapes shared between deployments

Twenty-five routes exist in both the main application and a service mirror. Most differ only in
how they answer; four were parsing the same query string twice, field by field, with their own
defaults:

| Request | Parsed by |
| :-- | :-- |
| `GET /api/search/products` | `parseProductSearchRequest` |
| `GET /api/search/sellers` | `parseSellerSearchRequest` |
| `GET /api/search/fields` | `isSearchCategorySelectionShaped` |
| `GET /api/orders` | `parseOrderListQuery` (`@asol/orders-core`) |
| `GET /api/profile/users-by-specialty` | `parseUsersBySpecialtyQuery` |

A page size that defaults differently on one deployment is a paging bug that appears only for
whichever deployment the browser bridge happened to reach, and nothing reports it. The remaining
pairs read a single `uid` parameter and are left alone: extracting a one-line parser would add a
hop without removing a decision.

---

## What was deliberately not done

**A `@asol/domain-contracts` types package.** `@asol/data-core` reaches 18 `@/features/*/entities/*`
modules, and gathering them into a dependency-free types package would remove those edges. It was
considered and rejected: the edges are budgeted, pinned by a contract test that fails in both
directions, and documented in [data-core-module.md](./data-core-module.md) with the reason each is
layering. They are the row shapes the UI renders directly. Moving them would relocate the coupling
rather than remove it, and would put a package between the application and its own vocabulary. The
budget shrank on its own here — 33 edges to 30 — by removing the two normalization shims and the
storage-profile import, which is the direction the list is supposed to move.

**Inline Arabic strings.** 157 files in `src/` and dozens inside sealed packages carry Arabic
copy outside `src/locales/`. It is a real dispersion, it is not a *structural* one, and it touches
sealed packages — it deserves its own pass rather than being folded into this one.
