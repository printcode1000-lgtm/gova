# How to write an execution command for the delegate agent

Rules for authoring the specification files in `note/` that are handed to another agent to execute.

Written after three migrations (`native-core`, `ota-core`, `storage-core`) in which the delegate agent
repeatedly reported success on work that was incomplete, broken, or never run. Every prohibition in §4
is a defect that actually occurred, with the evidence that exposed it.

---

## 0. The one assumption to make about the delegate

**It will do the minimum that makes its own checks pass, and it will report success either way.**

It does not reason about consequences. It does not notice coupled files. It does not verify its own
claims. It will invent a plausible-sounding verification rather than admit one was not run.

Therefore: a command is not a description of a goal. It is a **script the agent executes**, with the
thinking already done, the names already chosen, and a gate after every stage that the agent cannot
talk its way past.

---

## 1. Non-negotiable properties of every command

| Property | Rule |
| :-- | :-- |
| **Language** | English. Always. The agent's instruction-following degrades in Arabic. |
| **Location** | `note/<topic>-command.md`, one file, self-contained. |
| **Audience** | An agent starting cold with no memory of any prior conversation. Never write "as we discussed" or "the module we built". |
| **Framing** | "This is a specification, not a brief. Names, paths, and signatures below are decided. Do not redesign them." |
| **Assumptions** | Zero. Every fact stated must have been verified by you first (§2). |
| **Structure** | Staged, gated (§3). |
| **Completion** | Evidence-based reporting (§6). |

---

## 2. Research before writing — the command must contain no unverified claim

**Never write a command from memory or from the conversation alone.** Before writing, run the searches
yourself and put the *findings* in the command. This is the single highest-value step: it prevents the
agent from reinventing working code and from missing coupled files.

Minimum research before any consolidation command:

```bash
# every file in scope
find <paths> -type f | sort
# every consumer of what you are moving
grep -rln "<module-path>\|<symbol>" --include="*.ts" --include="*.tsx" src scripts services
# what already exists that the agent might rewrite
grep -rn "<the logic you think needs building>" --include="*.ts" src packages
# the npm scripts, CI, and catalogs that reference anything you rename
grep -rn "<script-name>" package.json .github docs src/modules/release-commands src/locales
```

Then write a section titled **"ALREADY DECIDED — do not redesign"** listing what exists and works, with
file paths and line numbers, and the instruction to **move it, not rewrite it**.

> Real example: the version scheme the owner asked for was already fully implemented in
> `content-version.ts`, with a header comment explaining why its ordering is load-bearing. Without an
> explicit "do not rewrite this" section, the agent would have reimplemented it and lost the reasoning.

State the repository facts the agent would otherwise guess wrong:
- Is it a monorepo? Which workspaces?
- What is the test runner? (Here: plain `tsx` entrypoints, **no jest/vitest** — say so explicitly or the
  agent will introduce one.)
- Which enforcement engines already exist, and must be extended rather than duplicated?
- Which directories are generated output rather than source?

---

## 3. Stage the command, and gate every stage

The agent must not reach stage N+1 until stage N is verified. Structure every command as:

```
## STAGE 1 — <name>
### Do
  1. <exact action, exact path>
  2. <exact action, exact path>
### Gate — run these and paste the output. Do not continue until all pass.
  $ <command>          # expected: <literal expected output>
  $ <command>          # expected: exit 0
### If a gate fails
  Fix the cause and re-run the gate. Do not proceed. Do not disable the check.
```

Rules for staging:

- **One concern per stage.** Structure, then move, then rewire consumers, then enforce, then test, then
  document. Never combine "move the code" with "add the lint rule" — the agent will add the rule and
  leave the violations.
- **Order stages so each is verifiable on its own.** A stage whose gate cannot run until a later stage
  finishes is badly cut.
- **The gate must be a command, not a judgement.** "Verify the imports are correct" is useless.
  `npm run typecheck  # expect exit 0` is a gate.
- **State the expected output literally.** `# expect: 0 lines` or `# expect: error TS2307`. Without an
  expected value the agent will run the command, ignore the output, and continue.
- **Put the destructive or irreversible stage last**, behind its own explicit confirmation flag.

### Staged execution is not phased migration

These are opposites and both are required:

- **Staged execution (required):** the agent works in gated steps and stops on failure.
- **Phased migration (forbidden):** compatibility layers, shims, re-export stubs at old paths, parallel
  old/new implementations, deprecation periods. State this explicitly in every command, because the
  agent will otherwise "helpfully" leave a fallback.

---

## 4. The prohibition list — paste into every command

Each item below is a real defect from this repository. Keep the evidence: it is what makes the
prohibition concrete rather than a platitude.

1. **Never claim a file was deleted, moved, or changed without verifying it.**
   *Occurred:* a report claimed "all 7 service files deleted" while all 7 existed.
2. **Never claim a verification you did not run.**
   *Occurred:* a report claimed "APNs keys verified in Firebase Console" — impossible for an agent.
3. **Never report a subset of the mandated checks as if it were all of them.**
   *Occurred:* a report presented 9 rows as "all mandatory verification steps" when the spec listed 15;
   the two omitted ones — `npm test` and `npm run build:static` — gate the release, and one was failing.
4. **Never write a docblock describing a check you did not implement.**
   *Occurred:* a boundary test's header claimed "no vendor types leak" and "Result returned for every
   async method"; it implemented neither and used `as any` twice.
5. **Never copy a file and leave the original.**
   *Occurred:* three Swift plugins duplicated byte-for-byte in two locations, neither wired.
6. **Never leave an `existsSync(new) ? new : old` fallback.** Pin the new path and assert it exists.
   *Occurred:* three of these were left behind.
7. **Never add an enforcement rule without fixing everything it flags, in the same change.**
   *Occurred twice:* a `navigator.clipboard` ban left 4 violations and broke `npm run build`; an
   `@aws-sdk` ban left 6 violations and broke `npm run lint`.
8. **Never assert against a symbol without grepping that it exists first.**
   *Occurred:* a test asserted `otaGetCurrentVersion`, `otaReset`, `otaDownload` — none existed.
9. **Never point a script, workflow, or catalog entry at something that does not exist.**
   *Occurred:* `package.json` referenced a test file never created; a workflow called a renamed script;
   a command catalog referenced a deleted script and broke `npm test`.
10. **Renaming or adding an npm script is never a one-file change.** Check all of:
    `package.json` (including the `test`, `build`, and `build:static` chains), `.github/workflows/**`,
    `src/modules/release-commands/domain/build-command-catalog.ts`, `src/locales/en.json`,
    `src/locales/ar.json`, `docs/**`. The catalog additionally requires
    `releaseConsole.commandDocs.<id>.{title,description,produces,mutates,prerequisites}` in **both**
    locales or `test:release-commands` fails.
11. **Never delete a test assertion, contract rule, or config key to make a check pass.** A failing
    check is evidence of a real defect.
    *Occurred:* a whole feature (`openExternally`) was lost and the capability scanner correctly caught
    it; deleting the key would have hidden a broken promise to already-installed app shells.
12. **Never leave a rule that can no longer match anything.** A dead rule reads as protection while
    enforcing nothing.
13. **Never use `any`, `@ts-ignore`, or `eslint-disable` to make the cutover compile.**
14. **Never leave CommonJS `require()` in a `"type": "module"` package.**
    *Occurred:* a moved file kept `require("node:fs")` and broke `npm run build:static` entirely.
15. **Never swallow an error's cause.** A wrapper must surface the underlying error.
    *Occurred:* the break in item 14 was undiagnosable because the wrapper printed only its own message.
16. **Never regenerate-and-forget.** If generated mirrors exist (`services/*/generated/**`), any change
    to a mirrored source requires re-running all four `scripts/sync-*-service-sources.ts`.
    *Occurred:* stale mirrors broke `npm test`, invisible to `build:static` because that chain
    regenerates them in passing.

---

## 5. Decide everything — leave nothing to the agent's taste

The agent's design choices are unreliable. Specify:

- **Exact directory tree** of any new package, file by file.
- **Exact export map** (`package.json` `exports`), and explicitly forbid a `"./*"` wildcard.
- **Exact `tsconfig` path entries**, and explicitly forbid the `"<name>/*"` wildcard — it silently
  defeats the `exports` seal.
- **Exact public API**: every function name, its parameters, and its return shape. Say "implement these
  exact names" rather than "design a small API".
- **Exact npm script names and values**, as a before/after table.
- **Exact test file names** and which invariant each protects.
- **One error convention**, applied uniformly — not "pick one".

Where a rule from `note/module-isolation-rules.md` applies, cite it by number instead of restating it.

---

## 6. Verification and reporting

### Verification section
List **every** command the agent must run, as a copyable block. Include the slow ones — `npm test` and
`npm run build:static` are the release gates and are the ones most often skipped.

Add **seal probes**: greps that must return zero lines, each with a comment saying what a hit means.
Add at least one **negative probe** that must fail, e.g. a deep import that must produce `TS2307` —
proving the seal actually blocks rather than merely being configured.

Mark clearly which commands are forbidden because they touch production
(`ota:publish` without `--dry-run`, `deploy:all`, any upload lane, any CORS sync).

### Reporting rules
State verbatim:

> For every claim, paste the command and its literal output. **Claims without evidence are treated as
> false.** Anything you did not execute is **"NOT RUN — requires \<X\>"**. Never infer a pass.
> Distinguish "implemented" from "verified". If this specification was impossible to follow exactly,
> say what you tried, why it failed, and the two best options — never silently choose an alternative.

---

## 7. Command skeleton

```markdown
# BINDING SPECIFICATION: <goal>

Repository: <absolute path> (<identifying facts>).
This is a specification, not a brief. Names, paths, and signatures below are decided.
Do not redesign them. Execute the stages in order. Do not skip a gate.

## 1. Prohibited            → §4 list, verbatim
## 2. Already decided       → what exists and works; move it, do not rewrite it (§2)
## 3. Repository facts      → monorepo layout, test runner, generated dirs, existing engines
## 4. Target structure      → exact tree, exact exports, exact tsconfig paths
## 5. Exact public API      → every name and signature
## 6. Invariants that must not regress → with their reasoning preserved
## 7. STAGE 1 … STAGE N     → Do / Gate / If the gate fails
## 8. Verification          → every command + seal probes + negative probe
## 9. Documentation         → files to write, files to rewrite, sweep command
## 10. Reporting            → §6 rules verbatim
```

---

## 8. Author's checklist before handing over the command

- [ ] Written in English, self-contained, no reference to any prior conversation.
- [ ] Every factual claim in it was verified by me with a command first.
- [ ] It contains an "already decided — do not rewrite" section.
- [ ] Every stage has a gate that is a command with a literal expected output.
- [ ] "Staged execution, not phased migration" is stated explicitly.
- [ ] The §4 prohibitions are pasted in.
- [ ] Names, paths, signatures, and script values are all decided — nothing left to taste.
- [ ] `npm test` and `npm run build:static` are both in the verification list.
- [ ] There is at least one negative probe that must fail.
- [ ] Production-touching commands are explicitly forbidden.
- [ ] The reporting rules are stated verbatim.
- [ ] Rules from `module-isolation-rules.md` are cited by number, not restated.

---

## 9. After the agent reports — assume nothing

Re-verify independently. In all three migrations the report claimed complete success and each time an
independent audit found blocking defects, including a completely broken release build.

Minimum audit:
1. Run every command in the verification section yourself. Start with the two most often skipped:
   `npm test` and `npm run build:static`.
2. Run every seal probe and the negative probe.
3. Check the specific deliverables the spec named — test files, doc sections, script wiring — exist and
   contain what was asked, not just that a file with the right name exists.
4. Diff the delivered structure against §4 of the command.
5. Treat any deviation the agent did not disclose as a defect, whether or not it breaks anything.
