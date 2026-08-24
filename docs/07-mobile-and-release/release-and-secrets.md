> **Note:** Operational detail relocated here during the 2026-08 architecture reconstruction. Architectural relationships: [docs/01-architecture/](../01-architecture/README.md).

# `@asol/release-core` and `@asol/secrets-core`

Two packages, one argument: the code that ships this project and the code that protects its
credentials were the only consequential code in the repository with no gate on it.

---

## `@asol/release-core`

### Mission

The shape of every release run: deployment phase order, the local command catalog and job state
machine, process execution, artifact discovery and bundle analysis. Application-only services
(HTTP, runtime guard, npm path and public version) enter through one fail-closed console port.

`deploy:all` pushes directly to `main` and is the only supported release path. Its ordering lived
in `scripts/lib/`, outside every package gate, beside a `vercel-deployment-monitor.ts` that only
re-exported `@asol/vercel-deploy-core` — a second name for a door that already existed.

### Door

| Door | Import | Contents |
| :--- | :--- | :--- |
| `.` | `@asol/release-core` | `DEPLOY_ALL_PHASE_ORDER`, `phasesFrom`, `phasePrerequisites`, the deploy state file, `runDeploymentNpmScript`, `pushMainBranch` |
| `./console` | `@asol/release-core/console` | Browser-safe command catalog, job transitions, progress parsing and artifact types |
| `./console-server` | `@asol/release-core/console-server` | Fail-closed job/process runner |
| `./console-artifacts` | `@asol/release-core/console-artifacts` | Artifact discovery and bundle analysis without loading the process/OTA graph |

### The phase order

```text
preflight → publish → notifications → products → orders → profiles → submain → sub2main → main
```

Main deploys last because the services it routes browsers to must exist first; preflight runs first
because everything after it is irreversible. The contract test pins this array **literally**, not
just its derived properties: every `phasesFrom` / `phasePrerequisites` check would still pass under
a reordering that published before preflight.

The CLI and the `/dev/deploy-all` page present this order as a nested runbook:
phase → section → branch → one command. The phase order and the printable sections/branches
live in `@asol/release-core` (`DEPLOY_ALL_RUNBOOK`, `DEPLOY_PUSH_RUNBOOK`). Scenario and
push-target enum values are shared with the command catalog via
`deploy-scenario-values.ts` so the UI cannot offer a value the runner does not accept.
`/dev/deploy-all` and `/dev/release-console` are `force-dynamic` and read those modules
directly; `test:release-commands` requires every runbook branch to have Arabic help and
requires `ANDROID_RELEASE_PATHS` to follow `ANDROID_RELEASE_RUNBOOKS` key order.

### What stays in `scripts/`

`scripts/deploy-all.ts` and `scripts/deploy-push.ts` remain the CLIs: which phase the developer
asked for, what to print, and when to stop. The package decides nothing about that.

---

## `@asol/secrets-core`

### Mission

The encrypted archive of everything this repository deliberately does not commit: the archive
format, the hybrid RSA + AES-256-GCM envelope, the workspace rules deciding which git-ignored files
are secrets, and the 7-Zip invocation.

### Door

| Door | Import | Contents |
| :--- | :--- | :--- |
| `.` | `@asol/secrets-core` | Archive workspace rules and the crypto envelope |

### The two rules its test exists for

- **Path containment.** `resolveInsideWorkspace` refuses anything that escapes the repository. The
  archive walks git-ignored paths and writes them back on restore; a path that escaped would let a
  crafted manifest overwrite files outside the workspace.
- **The archive's own files are never archived.** Backing up the encrypted archive into itself
  grows without bound, and backing up the recovery key into the archive it unlocks makes the key
  unrecoverable exactly when it is needed.

`assertEncryptedArchive` refuses any archive whose 7-Zip listing does not report `Encrypted = +`.
The contract test asserts this through the source rather than by producing an archive: 7-Zip is not
present on every machine, and a test that silently skips when a binary is missing is worse than no
test at all.

The CLIs — `secrets:backup`, `secrets:restore`, `secrets:key:init` — decide *when*; the package
decides *how*, and the test fails if a CLI starts doing its own cryptography.

### What is committed, and why both files are

`secrets:backup` publishes two files into `config/` — `PORTABLE_ARCHIVE_PATH`
(`secret-archive-latest.zip.enc`) and `PORTABLE_RECOVERY_KEY_PATH` (that path plus
`.private-key.pem`). **Both are tracked, and both must stay tracked.**

The requirement they serve is exact: download this repository as a ZIP onto a clean machine, run
`npm run secrets:restore`, type the passphrase, and every secret returns to its place. On a
non-interactive Cloud Agent VM, set `ASOL_SECRET_ARCHIVE_PASSWORD` instead of typing — the restore
CLI and `deploy:all` read that env var when stdin is not a TTY. Nothing else
is carried to that machine. Each piece of the chain has to already be in the ZIP:

- `resolveRestoreArchivePath()` looks only at `config/secret-archive-latest.zip.enc`.
- `decryptArchiveToZip` prefers the sidecar `<archive>.private-key.pem` and falls back to
  `.secret-archive/private-key.pem` — which is git-ignored and therefore absent from a fresh
  download. The sidecar is the only copy that travels.
- The passphrase the CLI prompts for unwraps that PKCS#8 key. It is not a ZIP password: the inner
  archive is built with `7z a -tzip` and no `-p`, so all of the protection is the RSA + AES-256-GCM
  envelope around it.

Remove either file from Git and the restore fails on a clean machine — the archive with
`No current secret archive exists`, the key with `Encrypted recovery key missing`.

`.gitattributes` marks both `-text`. `core.autocrlf` is on here and the key is PEM, so without it
the file arrives with CRLF endings that were never in the blob. Node's PEM parser tolerates that,
which is worse than if it did not — the corruption would stay invisible until a restore that
mattered.

### What this costs, plainly

This repository is public. The archive and the key that opens it are in the same download, so the
whole of the project's secrets rest on one thing: the strength of the passphrase on that PKCS#8
key. That is a deliberate trade for a restore that needs nothing but a ZIP and a password, not an
oversight — but it means the passphrase carries weight a passphrase does not usually carry, and it
is exposed to unlimited offline guessing by anyone who clones.

Two things follow. The passphrase should be long and random, not memorable. And because both files
have been public since they were first committed, the current passphrase should be treated as
already spent: `secrets:key:init` for a new keypair, `secrets:backup` to re-encrypt under it, and
new credentials at each provider for anything the old archive held.
