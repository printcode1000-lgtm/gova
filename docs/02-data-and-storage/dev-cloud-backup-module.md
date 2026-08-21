# Dev Cloud Backup Module

`@asol/backup-core` is the sealed archive capability behind the super-admin development-only tool for
backing up and restoring the cloud development state:

- Every Turso database reachable from the environment. Sources are discovered,
  not listed, so a database added to `.env` cannot be left out.
- Every Cloudflare R2 object in both the general and product buckets. There is
  no scope option and no prefix filtering: a backup is always complete.

The UI is available at `/super-admin/dev-cloud-backup`. It remains under
`src/modules/dev-cloud-backup`; one server wiring file supplies the Turso adapter and strict local
runtime guard to the package.
The presentation layer is split by responsibility: `DevCloudBackupPage.tsx` composes the screen,
`use-dev-cloud-backup-page.ts` owns client state and API operations, and the saved-list/result/status
components own rendering only.

The page is command-driven only. Operators do not upload or edit zip files
manually. Backups are created by the module, stored under `.backups/dev-cloud/`,
then inspected, compared, updated, downloaded, or deleted through buttons on the
saved backup row.

The backup policy is strict: if any configured Turso source is missing or R2
cannot be listed/downloaded, the operation fails and no partial zip is treated as
a successful backup.

## Runtime Guard

The module refuses to run unless all these conditions are true:

- `NODE_ENV=development`
- not running during a production build
- `NEXT_PUBLIC_ASOL_MODE` is not `static`
- `VERCEL` is not set
- the request is authenticated as super-admin

This keeps the tool out of production and static output. Outside development the page
returns `404` and every server action returns `devCloudBackupDevelopmentOnly`. The
sidebar hides the link in production builds and native clients.

## Zip Layout

Backups are stored locally under `.backups/dev-cloud/` and can be downloaded
from the page.

```text
gova-dev-cloud-backup-<timestamp>-<id>.zip
  manifest.json
  turso/
    <database-id>/          # one folder per discovered database
      schema.sql
      data/<table>.json
  r2/
    primary/objects/<encoded-r2-key>
    products/objects/<encoded-r2-key>
  reports/
    cloud-diff.json
    original-manifest.json
```

`reports/` exists only on zips created by “update from cloud”.

`manifest.json` contains `manifestVersion`, `createdByModuleVersion`, database
table metadata, R2 object metadata, and the R2 prefixes used for the backup.
The manifest is the compatibility contract for future module changes.

The package owns this contract, ZIP validation, local archive lifecycle, comparison, restore
orchestration and complete R2 traversal. Its database/environment port contracts live in
`packages/backup-core/src/server/dev-cloud-backup-ports.ts`, while
`dev-cloud-backup-service.ts` keeps orchestration behavior. The Turso repository remains in
`@asol/data-core`, the repository's only database-driver package, and implements
`backup-core`'s fail-closed database port.

## Editing Backups

The zip is intentionally editable:

- Add, remove, or edit rows inside `turso/<database>/data/<table>.json`.
- Add an R2 object by placing a file under `r2/objects/<encodeURIComponent(key)>`
  and adding a matching object entry to `manifest.json`.
- Remove an R2 object from the restore set by deleting both the file and its
  manifest entry.

Do not put Turso or R2 credentials inside the zip. The restore operation uses
the current local `.env` credentials.

## Compare And Update

The page compares saved zip files with the current Turso/R2 state. Manual zip
upload is not supported and has no endpoint.

Comparison uses SHA-256 hashes of every exported table JSON file and every R2
object body, so it detects content changes, not only count changes.

The “update zip from cloud” action creates a new full backup from the current
cloud state and adds:

- `reports/cloud-diff.json`: differences between the saved zip and current
  cloud state.
- `reports/original-manifest.json`: the manifest from the saved zip that was updated.

This is the safe way to evolve an edited or old backup file without losing a
record of what changed.

## Restore

Restore runs against a backup the module itself created and still holds under
`.backups/dev-cloud/`. The saved backup row carries both buttons; the archive is
addressed by file name and nothing is ever uploaded by hand.

`merge` runs `INSERT OR REPLACE` for all rows and uploads all R2 objects from the
archive. It does not delete cloud rows or R2 objects that are absent from the
backup.

`replace` deletes rows from the backed-up tables before reinserting them, and
deletes every R2 object in both buckets that is absent from the archive. It makes
the cloud match the archive exactly.

Each mode sends its own confirmation text, produced by
`devCloudBackupRestoreConfirmation` so the page and the server cannot drift:

- `RESTORE_DEV_CLOUD_BACKUP_MERGE`
- `RESTORE_DEV_CLOUD_BACKUP_REPLACE`

A restore refuses to start if the archive is incomplete, and fails loudly rather
than skipping a database whose credentials no longer resolve.

## Source Coverage

Coverage is exhaustive by construction, not by a maintained list.

`discoverTursoBackupSources()` reads every `*_DATABASE_URL` variable holding a
`libsql://` value and pairs it with `<NAME>_DATABASE_AUTH_TOKEN` or
`<NAME>_AUTH_TOKEN`. Well-known databases (`allusers`, `product`,
`advertisements`, and the shards from `DATABASE_SHARD_NAMES`) are seeded first so
they keep readable ids; discovery would find them regardless.

R2 always lists both buckets from an empty prefix. There is no partial mode.

`npm run test:dev-cloud-backup` fails if any libsql database in the environment
is missing from the backup sources, so the guarantee is enforced by the test
suite rather than by attention.

## Verification

Run:

```bash
npm run test:dev-cloud-backup
npm run test:backup-core
npm run architecture:check
npm run typecheck
```
