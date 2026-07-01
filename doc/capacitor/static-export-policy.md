# Static Export Policy

## Purpose

This document defines exactly which source files and routes may enter a GOVA static build. It applies to `build:static`, `ota:publish`, `cap:build`, `out/`, R2, Android, and iOS.

The implementation is in `scripts/build-static.ts`. It is allowlist-first: the complete `public/` directory is never copied automatically.

## Build Flow

The builder creates `.tmp-static-build` and performs these steps:

1. Deletes the previous temporary tree and `out/`.
2. Copies `src/` into the temporary tree.
3. Removes routes in `STATIC_ROUTE_IGNORELIST` from that temporary copy.
4. Copies required root configuration files.
5. Creates temporary `public/` content from the explicit allowlists.
6. Audits every source file in the real `public/` directory.
7. Fails if a non-hidden file is not classified as allowed or ignored.
8. Runs the Next.js static build.
9. Copies generated output to `out/`.
10. Generates the final file manifest.

Filtering never deletes files from the original `src/` or `public/` directories.

## Allowed Files

`STATIC_PUBLIC_ALLOW_FILES` contains required individual files:

| Path | Runtime ownership |
|---|---|
| `gova-app-init.js` | Blocking application initialization before React starts |
| `gova-theme-init.js` | Blocking theme initialization before React starts |
| `logo.png` | Layout metadata and the shared `AppIcon` component |
| `catagory/categories.json` | Category data loaded by Splash and Home |
| `catagory/subcategories.json` | Runtime subcategory catalog and image mapping |

Missing allowlisted files fail the build with `Required static asset not found`.

## Allowed Directories

`STATIC_PUBLIC_ALLOW_DIRECTORIES` copies these directories recursively:

| Directory | Runtime ownership |
|---|---|
| `images/mainCategories` | Complete main-category image catalog, including categories supplied by external data |
| `images/subCategories` | Complete subcategory image catalog |

Adding a directory permits every current and future file below it. Use a directory allowlist only when the whole directory is a runtime contract.

## Ignored Files

`STATIC_PUBLIC_IGNORE_FILES` contains reviewed files that must remain outside clients:

| Path | Reason |
|---|---|
| `catagory.db` | SQLite source used by the JSON export script |
| `gova-web-manifest.json` | Previous generated manifest; each build writes a fresh one |
| `gv_app_icon.png` | Source/native design asset not referenced by static runtime |
| `VERY GOOD.png` | Unused duplicate image |
| `images/logo.png` | Unused duplicate logo |
| `catagory/active_ingredient_forms.json` | Source export not requested by static runtime |
| `catagory/active_ingredient_strengths.json` | Source export not requested by static runtime |
| `catagory/active_ingredients.json` | Source export not requested by static runtime |
| `catagory/forms.json` | Source export not requested by static runtime |
| `catagory/pharmacy_categories.json` | Source export not requested by static runtime |
| `catagory/pharmacy_subcategories.json` | Source export not requested by static runtime |
| `catagory/product_brands.json` | Source export not requested by static runtime |
| `catagory/setting.json` | SQLite export metadata |
| `catagory/sqlite_sequence.json` | SQLite internal metadata |
| `catagory/strengths.json` | Source export not requested by static runtime |

Ignored files stay available to local tools but are not copied to static output.

## Ignored Directories

`STATIC_PUBLIC_IGNORE_DIRECTORIES` excludes these directories recursively:

| Directory | Reason |
|---|---|
| `images/icons` | Unused source and duplicate icon files |
| `images/logos` | Alternate/source logos not referenced by static runtime |
| `sync_data` | Local databases, schema reports, and development upload mirrors |

Nothing below these directories may enter `out/`, R2, Android, or iOS.

## Ignored Routes

`STATIC_ROUTE_IGNORELIST` removes routes only from the temporary static source:

| Source path | Result | Reason |
|---|---|---|
| `app/api` | No static API route output | Static hosts cannot execute Next.js server routes |
| `app/dev` | No `/dev/*` output | Development diagnostics are not production pages |
| `app/test1` | No `/test1` output | UI test page is not a production page |

The original routes remain available during local development.

## Hidden Files

Any path segment beginning with `.` is implicitly excluded, including `.gitkeep` and `.DS_Store`. These are repository controls, not runtime assets, and Capacitor's local WebView may not serve them reliably.

## Classification Guard

`assertPublicAssetPolicy()` scans the real `public/` directory recursively. A non-hidden file is accepted only when:

1. Its exact path is in `STATIC_PUBLIC_ALLOW_FILES`.
2. It is below `STATIC_PUBLIC_ALLOW_DIRECTORIES`.
3. Its exact path is in `STATIC_PUBLIC_IGNORE_FILES`.
4. It is below `STATIC_PUBLIC_IGNORE_DIRECTORIES`.

Otherwise the build stops with:

```text
Unclassified public assets. Add each path to the static allowlist or ignorelist:
<path>
```

This is intentional. New assets cannot be shipped or omitted without review.

## Generated Next.js Output

The lists classify source assets under `public/`. They do not enumerate compiled files generated by Next.js, including:

- `_next/static/chunks/*.js`
- `_next/static/chunks/*.css`
- route `index.html` files
- App Router RSC `.txt` payloads
- `_buildManifest.js` and `_ssgManifest.js`

These files are required by the compiled application and are included automatically. Arbitrarily deleting generated chunks breaks routing, hydration, or page loading.

The build also creates flattened RSC aliases required by static file servers on Windows and Capacitor.

## OTA Inventory

After compilation, `collectManifestFiles()` inventories final `out/` files:

- `gova-web-manifest.json` excludes itself.
- hidden files are excluded.
- every other output receives a SHA-256 and byte size.

`ota:publish` publishes exactly that inventory. A file removed by a policy change is deleted from R2 during the next publication and is absent from the next staged application release.

## Adding A Runtime File

1. Add the file under `public/`.
2. Confirm its direct or dynamic runtime reference.
3. Add its normalized path to `STATIC_PUBLIC_ALLOW_FILES`.
4. Run the static build.
5. Verify the path exists in `out/gova-web-manifest.json`.

For a complete required directory, add it to `STATIC_PUBLIC_ALLOW_DIRECTORIES` only after confirming every child is safe and needed. Do not allow a broad parent such as `images` when only one child directory is required.

## Adding A Development File

1. Keep it under `public/` when local tooling requires that location.
2. Add the exact path to `STATIC_PUBLIC_IGNORE_FILES`, or its dedicated directory to `STATIC_PUBLIC_IGNORE_DIRECTORIES`.
3. Document the reason.

Do not ignore a file merely because its runtime reference is difficult to trace. Check direct references, dynamically constructed paths, and names supplied by APIs or databases.

## Review Checklist

- Verify path casing; Android assets and R2 keys are case-sensitive.
- Search direct and dynamically constructed runtime paths.
- Check whether external data can name an image absent from bundled JSON.
- Prefer individual file permission over a broad directory.
- Permit a complete directory when external runtime data can reference any child.
- Keep databases, reports, source exports, and local upload mirrors out of clients.
- Run `npm run typecheck` and `npm run architecture:check`.
- Build and inspect `out/gova-web-manifest.json`.
- After publication, verify R2, Android, and iOS versions and hashes match.

## Current Public Output Contract

The hand-managed public portion of static output is:

```text
gova-app-init.js
gova-theme-init.js
logo.png
catagory/categories.json
catagory/subcategories.json
images/mainCategories/**
images/subCategories/**
```

All other final manifest entries must be generated Next.js output or generated manifest support.
