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

The CLI presents this order as a nested runbook: phase → section → branch → one command. The phase
order stays in `@asol/release-core`; the script owns the printable sections and branches because
they are operator-facing CLI structure rather than release-core invariants.

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

### What is committed, and what is not

`secrets:backup` publishes two files into `config/` — `PORTABLE_ARCHIVE_PATH`
(`secret-archive-latest.zip.enc`) and `PORTABLE_RECOVERY_KEY_PATH` (that path plus
`.private-key.pem`). Only the **archive** is tracked. The recovery key is git-ignored and must
travel out of band.

Both were tracked until 2026-08-22, on a public repository, which put the ciphertext and the key
that opens it in the same download. The key file is itself passphrase-encrypted PKCS#8 — the
restore CLI prompts for that passphrase — so nothing was ever exposed in plaintext, but publishing
both reduced the archive's security to a single offline passphrase guess, which is not what the
envelope was designed to rest on.

Untracking it does not unpublish it: the key remains reachable in this repository's history, and the
archive it opens is in there too. The remediation that actually closes it is rotation —
`secrets:key:init` for a new keypair, `secrets:backup` to re-encrypt, and new credentials at each
provider for anything the old archive held. Deleting the file from `HEAD` only stops the exposure
from being extended.
