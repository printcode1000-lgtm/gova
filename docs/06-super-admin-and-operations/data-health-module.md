# Data Health Module

## Objective

The `/super-admin/data-health` application module composes the sealed `@asol/data-health-core`
capability with `data-core`, storage and system logging. The package owns shared policy, contracts
and the image-source registry; the application owns presentation and orchestration.

Next.js files under `src/app` are thin entry points. Business logic, UI, policies, and repositories reside within the module to facilitate adding new health check rules without bloating the Super Admin page.

## Environment Boundaries

- The `/super-admin/data-health` page and its API routes are available in local development only.
- Outside development the page returns `404` and every API call returns `dataHealthDevelopmentOnly`.
- The sidebar hides the link in production builds and native clients.
- Static/mobile builds exclude this route from the export output.
- In development, local SQLite databases and local storage are checked.
- Schema comparison is read-only, development-only, and loads when opening the schema comparison tab.
- If Turso connection credentials are missing in development, the database status displays as `unavailable`.

## Module Components

- `domain`: Types, signatures, retention periods, and confirmation policies.
- `db`: Schema definitions for health checks log, plans, audit trails, quarantines, and locks.
- `repositories`: Database readers, storage inventories, schema comparators, and specific change applicators.
- `services`: Plan creation, plan validation, locking, and quarantine management.
- `presentation`: Super Admin interface split by responsibility. `DataHealthPage.tsx`
  composes the screen, `use-data-health-page.ts` owns client state and API
  actions, and the panel/dialog files own rendering for findings, topology,
  schema comparison, history, and confirmation dialogs.
- `tests`: Policy contracts, signatures, and module table schema tests.

## Inspection Scope

- Products and profiles lacking an active user.
- Profile, product, pharmacy, custom order, and advertisement images.
- Image references missing files, and stored files lacking any database reference.
- Featured products, user followings, and delivery fulfillment channels.
- Profile and product reviews, replies, and votes.
- Discount usage records linked to a missing user or order.
- Order headers, seller orders, custom orders, items, shipments, payments, refunds, and replacements.
- SQLite/Turso integrity checks via `quick_check` and `foreign_key_check`.
- Tables, columns, data types, default values, foreign keys, indexes, views, and triggers during schema comparison.

## In-Page Execution Map

The `/super-admin/data-health` page displays a live execution map generated dynamically by the inspection process itself, rather than a static list of names. Each database displays its name, tables, and connection status. This covers all current operational databases:

- Core System Databases: `users`, `product`, and `advertisements`.
- Eight Profile Databases: `profile-core`, `profile-contact`, `profile-media`, `profile-social`, `profile-catalog`, `profile-promotions`, `profile-fulfillment`, and `system-ops`.
- Nine Order Databases: `orders-core`, `orders-items`, `orders-fulfillment`, `orders-delivery-plans`, `orders-shipping-quotes`, `orders-payments`, `orders-refunds`, `orders-after-sales`, and `orders-disputes-audit`.

The inspection executes `quick_check` and `foreign_key_check` independently for each database. If the runtime driver does not support a specific SQLite check, the page logs a warning with the database name instead of dropping the check or attributing the result to another database.

The map also renders all registered image sources defined in
`packages/data-health-core/src/domain/source-registry.ts` alongside tables, fields, and ownership
types. This encompasses owned images, shared image snapshots, fixed assets, and storage cleanup
tasks (not limited to files in R2).

### Image Storage Targets

Displays three distinct storage targets:

- `r2-primary`: New R2 bucket for profile images (`avatar` and `cover`), home hero slider (`home-hero-slider`), and custom order images (`spicialOrder`).
- `r2-products`: Legacy R2 bucket for product images (`product-default`) exclusively.
- `local-sync-mirror`: Local unified mirror located under `public/sync_data/sync_file/images/...`, excluded from cloud operations.

Storage bucket distribution and directory paths depend on `packages/storage-core/src/config/storage-profiles.json`. Account credentials, keys, and secret access tokens are never exposed on the user interface.

Historical order items are not treated as corrupted simply because the active product was deleted, provided the name/image snapshot remains preserved. Financial and dispute records are never deleted automatically.

## Inspection Cycle

1. Creates a `running` record with a unique execution ID.
2. Reads databases in parallel where safe.
3. Health check rules aggregate standardized results with stable issue signatures and record state signatures.
4. Performs storage inventory across all pages (not limited to the first 1000 files).
5. Persists issue results alongside first-seen and last-seen timestamps.
6. Updates inspection log status to `completed` or `failed`.

Available statuses: New, Recurrent, Quarantined, and Ignored. Reports are exportable in JSON and CSV formats, and the system retains the last 30 inspection runs in the log view.

## Safe Cleanup

- No inspection result is selected by default.
- The server rejects empty requests or lists containing more than 250 items.
- Plan creation re-runs inspection and accepts only items that remain valid for cleanup.
- Plans are valid for 10 minutes, scoped to the admin session and environment, and single-use only.
- Each item carries a state signature to prevent cleaning records modified after plan generation.
- A 5-minute concurrency lock prevents simultaneous execution of multiple cleanup operations.
- Production confirmation requires entering the total item count and the confirmation keyword (`production`).
- Every result is recorded in a permanent audit log, including skipped items and skip reasons.

Direct automated actions are strictly limited to archiving products, archiving orders after retention periods, and removing broken non-financial reference relations. Profiles, images, and sensitive records enter quarantine instead of immediate deletion.

## Quarantine & Image Deletion

- Default quarantine duration is 30 days.
- Super Admin can release an item from quarantine at any time.
- The actual file deletion button appears for an image file only after the quarantine period expires.
- Before deleting a file, inspection re-runs and requires zero references across all databases.
- Deletion targets the correct storage profile before writing to the audit log.
- Automated deletion of R2 files or local files does not exist.
- The `Clean Quarantine` button is a manual, explicit, and confirmed operation. It deletes all active quarantined items and corresponding image files from R2 or local storage, then removes the associated primary records. Any failed file deletion remains in quarantine with an audit log detailing the cause.
- The results tab presents quarantined items in a read-only state; they cannot be re-selected or have quarantine restarted from a new cleanup plan.

## Order Policy

- Orders with a deleted buyer are archived rather than deleted.
- Closed orders become eligible for archiving after 90 days.
- Payments, refunds, replacements, and historical logs are protected from automated cleanup.
- Deletion of an active product does not invalidate an order item if its historical snapshot is complete.

## Adding a Health Check Rule

Add the rule inside the appropriate repository and return `DataHealthIssue` using `makeIssue`.
The result must contain structured evidence, a known action, a cleanup pattern, and a stable record identity.
Any new cleanup action requires:

1. A new action type in `DataHealthCleanupAction`.
2. A conditional execution handler confirming the record state has not changed.
3. UI labels and descriptions in English.
4. Policy or integration test coverage.
5. Documentation detailing data impact and recoverability.

## Execution and Verification

```text
npm run db:ensure
npm run test:data-health
npm run typecheck
npm run architecture:check
npm run build
```

`db:ensure` creates module tables in the `system-ops` shard using idempotent operations.
During production builds, schema synchronization reads the SQLite database and adds missing tables to Turso within standard project sync workflows.

## Environment Contracts & Data Sources

Data source resolution is standardized via `isDevRuntime` and `resolveDataHealthExecutionContext`:

| Runtime             | Operational Databases | Images                             | Schema Comparison             |
| ------------------- | --------------------- | ---------------------------------- | ----------------------------- |
| Local Dev Server    | SQLite only           | `public/sync_data/sync_file` only  | SQLite vs Turso (Read-only)   |
| Production Server   | Turso only            | Cloudflare R2 only                 | Unavailable                   |
| `static out` client | Calls Production API  | Server inspects R2                 | Unavailable                   |

Presence of Turso credentials in development env files does not switch local runtime to cloud; those credentials are used solely for schema comparison. Vercel environment or `ASOL_DATA_SOURCE=cloud` forces cloud source. Local source can be explicitly forced using `ASOL_DATA_SOURCE=local` outside Vercel.

The `static out` build contains no database secrets and does not connect directly to Turso or R2. `NEXT_PUBLIC_ASOL_API_BASE_URL` must point to the production server; the data health page rejects reports originating from local servers when running in static mode.

## Image Source Contracts

`@asol/data-health-core` maintains a registry of every table or manifest storing images or image
snapshots. The `test:data-health` suite reads SQLite schema and fails if an unregistered image
field is detected. It also verifies that all enabled cloud storage files utilize R2 and that fixed
pharmacy image assets exist.

Storage inventory does not hardcode storage file lists; it dynamically reads all enabled profiles from `storage-profiles.json`. The JSON reader extracts `imageKey`, `image_key`, `storageProfileId`, and `storage_profile_id` at any nesting depth, supporting fallback defaults for legacy data.

Recently uploaded storage files are not classified as orphan images before 24 hours elapse. Thereafter, plan creation and re-inspection are required prior to quarantine, followed by another re-inspection after quarantine expiry before actual deletion.

The `static out` build verifies all `pharmacy/ingredients.json` references and halts if the corresponding image is missing from `out/images/pharmacy_fixed`.

## Delete All Orders

The hazard section on the page provides a dry-run preview for deleting all standard, custom, and hybrid orders.
The preview automatically detects child tables dependent on `orders` via foreign keys and `order_id` fields, displaying row counts per table and custom order image counts.

The plan is valid for 10 minutes, bound to the Super Admin session, environment, and record/image count hash, requiring typing a confirmation string that includes the count and environment name. Re-extracting the hash occurs before execution, and an independent concurrency lock prevents running two deletion jobs simultaneously.

Order rows are deleted within a single database transaction in dependency order. Upon transaction success, custom order images are deleted from LocalStorage or R2 depending on the environment. Any image deletion failure is logged in `data_health_storage_deletion_tasks` for retry from the page. Administrative operation logs are persisted outside the orders database, ensuring they persist after deleting internal order audit trails.
