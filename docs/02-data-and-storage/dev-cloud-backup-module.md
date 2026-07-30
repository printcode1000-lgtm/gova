# Dev Cloud Backup Module

`src/modules/dev-cloud-backup` is a super-admin development-only tool for
backing up and restoring the cloud development state:

- Turso databases used by the app.
- Cloudflare R2 images/files. The default mode backs up the whole bucket with
  no prefix exclusions.

The UI is available at `/super-admin/dev-cloud-backup`.

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

This keeps the tool out of production and static output. The page may render in
other environments, but every server action returns
`devCloudBackupDevelopmentOnly`.

## Zip Layout

Backups are stored locally under `.backups/dev-cloud/` and can be downloaded
from the page.

```text
gova-dev-cloud-backup-<timestamp>-<id>.zip
  manifest.json
  turso/
    allusers/
      schema.sql
      data/<table>.json
    profile/
      schema.sql
      data/<table>.json
    product/
      schema.sql
      data/<table>.json
    advertisements/
      schema.sql
      data/<table>.json
    marketplace-orders/
      schema.sql
      data/<table>.json
  r2/
    objects/<encoded-r2-key>
  reports/
    cloud-diff.json
    original-manifest.json
```

`reports/` exists only on zips created by “update from cloud”.

`manifest.json` contains `manifestVersion`, `createdByModuleVersion`, database
table metadata, R2 object metadata, and the R2 prefixes used for the backup.
The manifest is the compatibility contract for future module changes.

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
upload and manual restore flows are disabled.

Comparison uses SHA-256 hashes of every exported table JSON file and every R2
object body, so it detects content changes, not only count changes.

The “update zip from cloud” action creates a new full `all-r2` backup from the
current cloud state and adds:

- `reports/cloud-diff.json`: differences between the saved zip and current
  cloud state.
- `reports/original-manifest.json`: the manifest from the saved zip that was updated.

This is the safe way to evolve an edited or old backup file without losing a
record of what changed.

## Restore Modes

`merge` is the default mode. It runs `INSERT OR REPLACE` for all rows and uploads
all R2 objects from the archive. It does not delete cloud rows or R2 objects that
are absent from the backup.

`replace` deletes rows from the backed-up tables before reinserting them. It also
deletes R2 objects under the backed-up prefixes when those objects are absent
from the archive. Use it only after inspecting the preview.

Both modes require typing the exact confirmation text shown by the page:

- `RESTORE_DEV_CLOUD_BACKUP_MERGE`
- `RESTORE_DEV_CLOUD_BACKUP_REPLACE`

## Source Coverage

Turso sources are discovered from the environment variables already used by the
project:

- `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
- every profile/order shard pair using `<SHARD>_DATABASE_URL`, `<SHARD>_DATABASE_AUTH_TOKEN`
- `TURSO_PRODUCT_DATABASE_URL`, `TURSO_PRODUCT_AUTH_TOKEN`
- `TURSO_ADVERTISEMENTS_DATABASE_URL`,
  `TURSO_ADVERTISEMENTS_AUTH_TOKEN`

R2 full mode uses an empty prefix and lists the whole bucket. Known-project-file
mode reads enabled `CloudflareR2` profiles from
`src/config/storage-profiles.json`; it is available only for targeted checks and
is not the default.

## Verification

Run:

```bash
npm run test:dev-cloud-backup
npm run architecture:check
npm run typecheck
```
