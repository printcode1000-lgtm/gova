# `@asol/release-core` and `@asol/secrets-core`

Two packages, one argument: the code that ships this project and the code that protects its
credentials were the only consequential code in the repository with no gate on it.

---

## `@asol/release-core`

### Mission

The shape of a release run: the phase order, what each phase depends on, how a resumable run
remembers where it stopped, and how a child npm script is streamed and its Vercel deployment
awaited.

`deploy:all` pushes directly to `main` and is the only supported release path. Its ordering lived
in `scripts/lib/`, outside every package gate, beside a `vercel-deployment-monitor.ts` that only
re-exported `@asol/vercel-deploy-core` — a second name for a door that already existed.

### Door

| Door | Import | Contents |
| :--- | :--- | :--- |
| `.` | `@asol/release-core` | `DEPLOY_ALL_PHASE_ORDER`, `phasesFrom`, `phasePrerequisites`, the deploy state file, `runDeploymentNpmScript`, `pushMainBranch` |

### The phase order

```text
preflight → publish → notifications → products → orders → profiles → submain → sub2main → main
```

Main deploys last because the services it routes browsers to must exist first; preflight runs first
because everything after it is irreversible. The contract test pins this array **literally**, not
just its derived properties: every `phasesFrom` / `phasePrerequisites` check would still pass under
a reordering that published before preflight.

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
