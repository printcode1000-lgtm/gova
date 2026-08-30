# Local Agent Host Recovery

Captured by `npm run local-agent:host:backup`. Replayed by
`npm run local-agent:host:restore`.

## What is here

| Path | Contents |
|---|---|
| `host-manifest.json` | host, toolchain, linger, repository wiring, and 6 runner descriptors |
| `systemd/` | the verbatim systemd **user** units for the runner pool |
| `runner-env/` | each runner's `.env` and `.path`, with credential-shaped lines redacted |

## What is deliberately not here

`.credentials`, `.credentials_rsaparams`, and `.registration-token`. Those are
runner registration secrets. A rebuilt runner registers again with a fresh
registration token derived from `GITHUB_ADMIN_TOKEN`, so replaying an old
credential would be insecure and would not work anyway.

## Recovering a rebuilt machine

1. Install Node and git, then clone the repository to `/home/hesham/gova`.
2. Restore the git-ignored secret files: `npm run secrets:restore`.
3. `npm ci`
4. `npm run local-agent:host:restore` — recreates the pool directories,
   downloads the recorded runner release, registers each runner against the
   repository, installs the systemd units, and starts them.
5. `loginctl enable-linger $USER` if the manifest recorded linger as enabled and
   restore reported it missing. This is the one step that may prompt for
   authentication, so restore never performs it for you.
6. `npm run local-agent:doctor` — every check must pass.

## Keeping it current

Re-run the backup after adding or removing a runner, changing a unit file,
changing runner labels, or upgrading the runner release. `--dry-run` shows what
would be written without touching anything.
