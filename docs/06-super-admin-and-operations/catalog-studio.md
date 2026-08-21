# Catalog Studio

## Purpose and hard boundary

Catalog Studio is the Super Admin development workspace for the complete Catalog v3 tree under
`public/catagory`. Its route is `/super-admin/catalog` and it is intentionally unavailable outside
a desktop web development server.

The boundary is enforced at every relevant layer:

- the page calls `notFound()` unless `NODE_ENV === "development"`;
- both write APIs return `404` outside development before doing any work;
- every API request still requires an authenticated Super Admin session;
- the sidebar entry is rendered only in development, outside Capacitor, and at a viewport width of
  at least 1024 pixels;
- the page itself repeats the desktop/non-native check instead of trusting the sidebar;
- `build:static` removes the page and all API routes from its temporary source tree and audits that
  no `/super-admin/catalog` or `/api/dev/catalog-studio` output exists.

The feature never reads or writes user rows. Its only database-related information is the static
column mapping declared in `core/specialty-columns.json` for
`profile-core.user_specialties`. Local and cloud user data are outside its scope.

## Workspace

The page exposes these top-level views:

- Overview: catalog version, item/image counts, validation state and entry points to every file.
- Core, Pharmacy and Vehicles: structured and raw editing for every data file in that domain.
- Assets: managed image inventory, references, upload, safe replacement and recoverable removal.
- Schemas: all published JSON Schemas, always read-only.
- Audit: local development actions, validation output and recovery locations.

Each editable file supports structured, raw JSON, relation and diff views. Structured editing
includes search, localized names, global `display.order`, global `display.hidden`, sibling reorder,
add, clone, delete and full-item JSON inspection. Relationship views expose parents, collection
members, pharmacy forms and strengths, vehicle option files, image references, and the static
`user_specialties` column mapping.

Unsaved drafts are kept in the current browser session and are restored only when the canonical
revision still matches. A navigation warning protects dirty work. The server remains the authority:
client-side previews never bypass full cross-file validation.

## Save contract

Validation and save both use `scripts/validate-catalog.ts`; the editor does not maintain a weaker
second validation model. A save performs the following indivisible workflow:

1. reject paths outside the catalog, schema edits, duplicate drafts and stale base hashes;
2. copy the complete catalog into an operating-system temporary directory;
3. apply all draft files to that copy and validate schemas, identities, orders, visibility,
   references, assets and the specialty-column contract;
4. preserve the current canonical files in `.catalog-studio/transactions/<id>` and write an
   interruption journal;
5. replace each target through a same-directory temporary file and rename;
6. validate the real catalog again;
7. rollback from the preserved copies on any commit or post-validation failure;
8. clear the journal/transaction only after success and append a local audit entry.

Only one save may execute in the process at a time. A later request also recovers an interrupted
journal before reading or writing, so a terminated development server cannot leave a silent partial
catalog. `.catalog-studio/` is ignored by Git and never enters `public`, production, mobile or the
static bundle.

## Image contract

Managed roots come exclusively from `manifest.json`; the editor does not guess asset directories.
Uploads accept PNG, JPEG and WebP files up to 10 MB, validate both extension and file signature, and
reject traversal or replacement unless replacement was explicitly requested. Replacement first
stores a recovery copy outside `public`.

Removal is allowed only when the current complete catalog has no reference to the image. The file is
moved to `.catalog-studio/trash/images` and its recovery path is recorded; the editor never performs
an irreversible image delete. Referenced images display their owning JSON identities and cannot be
removed.

## Ownership

- `src/features/catalog-studio/presentation` owns the development UI. The page
  keeps screen orchestration, while formatting helpers, section metadata, and
  small shared presentation controls live in separate files beside it. Local
  draft session persistence is isolated in `catalog-studio-drafts.ts`.
- `src/features/catalog-studio/services/catalog-studio.service.server.ts` owns filesystem access,
  validation, transactions, recovery, images and audit.
- `src/app/api/dev/catalog-studio` contains thin authenticated development-only adapters.
- `src/app/super-admin/catalog/page.tsx` is only the route guard and feature entry point.
- `@asol/catalog-core` is a thin re-export shim over `@asol/catalog-core`; Catalog Studio does not
  replace normal runtime loaders.

## Verification

Run:

```bash
npm run test:catalog-studio
npm run catalog:validate
npm run typecheck
npm run architecture:check
npm run build:static
```

`test:catalog-studio` verifies complete inventory, schema read-only policy, relationship coverage,
failed-draft isolation, stale-write rejection, referenced-image protection, unsafe image names and
the static source exclusion. The write smoke test used during implementation also commits identical
bytes transactionally and uploads then recoverably removes an unreferenced test image.

