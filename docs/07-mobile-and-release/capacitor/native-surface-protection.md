# Native Surface Protection

How this repository keeps changes inside the layer OTA can ship, and tells you
the moment one escapes it.

## The goal, stated honestly

**Freezing native code does not remove store releases. It removes the
*accidental* ones.**

Some releases are forced from outside and no amount of discipline avoids them:

- Google Play mandates a `targetSdk` bump on a schedule.
- A security fix lands in Capacitor, AndroidX, or Firebase.
- A new Android version changes behaviour the shell depends on.
- Signing or Play policy requirements change.

The achievable goal is moving from *a store release per feature* to *a store
release once or twice a year for reasons outside your control*. A protection
scheme that promises zero is selling something.

## What actually protects the boundary

The repository is developed by one person. That matters: the threat is
**forgetting**, not an unauthorised change. Locks defend against the second and
do nothing about the first, so the design optimises for **early, trustworthy
discovery** instead.

| Layer | Where | Fails the build? |
|---|---|---|
| Classifier | `scripts/ota/ota-native-compatibility.ts` | — |
| Report at check time | `npm run architecture:check` | **No** |
| Enforcement at publish time | `npm run ota:publish` | **Yes** |
| Regression test | `npm run test:ota-core` | Yes |

### The classifier

A change is native because of **what it binds to, not where it sits**:

| Rule | Result |
|---|---|
| `android/`, `ios/`, `capacitor.config.ts` | native — these *are* the store binary |
| `fastlane/`, `assets/` | **never native** — CI tooling and source art |
| `src/`, `platform/` | native only if the content imports a Capacitor plugin, or the file is a listed `NATIVE_CONTRACT_FILES` entry |
| `tests/`, `__tests__/` | never native — they do not ship |

`platform/` was once native by path. It is not: `capacitor.config.ts` imports
nothing from it, and its constants are read by build scripts and baked into the
web bundle, so they travel over OTA like any other string. The same folder is
native the instant a file in it imports a plugin.

### Report, do not block

`architecture:check` prints a **Native Surface** panel listing what changed and
what it will cost — and passes anyway.

Touching native code is legitimate work. Failing the check would block the
change rather than inform it, and would turn every genuine native fix into a
red build. The enforcing gate stays at `ota:publish`, where refusing is
correct because that is the moment something would actually be shipped.

The panel is **silent** when there is nothing to say: no changes, or no
resolvable baseline. CI checks out with `fetch-depth: 0` so the `native-v*` tag
exists and the report is meaningful there too; without it the check would be
quiet in CI and the signal would live only on one laptop.

## Why the noise was removed first

A gate is worth exactly what its alarms are believed to mean.

One release flagged six files:

| Flagged | Genuinely needed a store release? |
|---|---|
| `BackgroundDownloadPlugin.java` | **yes** — Java compiled into the binary |
| `platform/capacitor.defaults.ts` | no — build-time URL constants |
| `fastlane/Fastfile` | no — CI tooling |
| three `packages/native-core/*.ts` | no — TypeScript facades over a plugin already compiled into the shipped shell |

Five of six were false, and the response was to declare
`ASOL_OTA_MINIMUM_NATIVE_VERSION` **five times in a row** without re-reading the
list. That is what an over-reporting gate trains a developer to do, and it is
worse than no gate: the one true alarm arrives looking exactly like the five
false ones.

So the order was deliberate — **clean the signal, then extend its reach.**
Adding locks on top of a noisy classifier would have multiplied friction without
adding safety.

Verified rather than assumed: after the change, `fastlane/Fastfile` and
`platform/capacitor.defaults.ts` still differ from the baseline and no longer
appear in the report. Their absence is evidence, not coincidence — had they been
identical to the baseline, disappearing would have proved nothing.

## What a declaration may and may not excuse

`ASOL_OTA_MINIMUM_NATIVE_VERSION` (or `--minimum-native-version`) says: *this
bundle runs on a shell that already shipped*.

That claim is **arguable** for a TypeScript facade over a plugin the shell
already contains — the plugin is compiled in, only the vocabulary naming it is
new.

It is **false by construction** to claim that the existing baseline contains a
change to the shell's own compiled source. Editing Java, Swift,
`AndroidManifest.xml`, a Gradle file, or `capacitor.config.ts` changes the
binary. Such a change may target only a **strictly newer** native version; it can
never be assigned to the baseline version or anything below it.

The same applies when an installed Capacitor/Cordova dependency is added,
removed, or version-changed: its Android/iOS implementation exists only after a
new store build. Build-only packages such as `@capacitor/cli` and web bridge code
such as `@capacitor/core` are excluded so this rule does not recreate the noisy
gate it replaced.

`ota:publish` now refuses a missing, equal, or lower declaration for such a
change, and names the file. A higher version is safe to stage because baseline
devices reject it; that higher shell must still be built, tested, published to
the store, and tagged before it can reach users:

```text
Refusing to publish: compiled native changes require a newer shell.
The declared minimum native version must be strictly higher than the 0.2.0 baseline.
These changes do not exist in the baseline shell:
  - android/app/src/main/java/hgh/asol/app/BackgroundDownloadPlugin.java
```

### The incident that produced this rule

A fix to `BackgroundDownloadPlugin.java` — Capacitor's `getLong` returns null
for any bundle size below ~2.1 GB, so `schedule` rejected every download — was
waived with `ASOL_OTA_MINIMUM_NATIVE_VERSION=0.2.0`, and four releases were
published claiming compatibility with the 0.2.0 store shell.

That shell carries the **unfixed** plugin. It therefore cannot perform the
download those bundles depend on. The releases were installable only on a debug
build that already had the fix.

No incompatible bundle could be installed through this path: a genuine 0.2.0
device cannot schedule any OTA download at all, precisely because of the bug
being fixed. That does **not** prove zero user impact without telemetry; a
device may still have detected the release and experienced a failed attempt.
The false compatibility claim was hidden because no affected shell could reach
the installation stage.

The gate was right and the declaration was wrong. The regression test executes
the real publisher with `--dry-run` in isolated repositories and pins four
decisions: compiled source at the baseline version is rejected, a compiled
native dependency at the baseline version is rejected, a strictly newer shell
version is accepted for staging, and a web facade over an existing plugin
remains declarable.

## What is deliberately not done

**A frozen fingerprint file** (`native-freeze.json` with per-file hashes). It
needs a manual update on every legitimate change, and with a single developer
reviewing their own work it decays into a ritual.

**CODEOWNERS.** It needs a second reviewer to mean anything, so it was deleted
outright — see rule 6 in
[the module isolation rules](../../01-architecture/02-packages/module-isolation-rules.md#6-branch-protection).

Branch protection is the exception on this list: it *is* applied, because its
value here does not come from review. Force-pushes and deletions are blocked and
the `verify` status check is required, and a status check is a reviewer that
works with one developer.

**A `pre-commit` hook.** It slows every commit for protection that
`--no-verify` removes without thought. The check-time report gives the same
information at the point where it is read.

These are the right tools for a team. They are not the right tools here, and
adopting them anyway would produce ceremony that gets bypassed.

## The coarseness that remains

A TypeScript file importing `@capacitor/app` is flagged native even when that
plugin is **already compiled into the installed shell** — so the change is
genuinely OTA-safe. This is not hypothetical: it is exactly the case behind the
three `packages/native-core/*.ts` false positives above.

The information needed to decide is already in the repository.
`CAPABILITY_AVAILABILITY` records `backedSince` — the first shell that contains
the plugin — separately from `vocabularySince`. The classifier does not consult
it.

Until it does, this class of alarm needs the judgement described in
[Declaring the minimum native version](./ota-update-system.md#declaring-the-minimum-native-version):
check whether the plugin is in the shipped shell before assuming a store
release.

## The strategic half

Everything above prevents or reveals native changes. It does not reduce how
often you *need* one. That is a build-time decision:

**Ship a shell carrying the plugins and permissions you expect to need**, so a
later feature is web code alone. The capability system is already built for
this — `backedSince` versus `vocabularySince` exists precisely so a capability
can be named by an OTA bundle for a shell that already contains it.

Protection without this makes native work harder without making it rarer.

See [OTA Update System](./ota-update-system.md) for the delivery mechanics and
[What still requires a store release](./ota-update-system.md#what-still-requires-a-store-release)
for the current boundary.
