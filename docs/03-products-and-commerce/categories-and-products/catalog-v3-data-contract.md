# Catalog v3 Data Contract

## Purpose

Catalog v3 is the canonical, database-independent source for categories, profile-specialty
relationships, the fixed pharmacy catalog and vehicle options. It is designed for deterministic
runtime loading and the development-only Catalog Studio visual editor.

The root is `public/catagory`. The legacy spelling is retained only as a public compatibility
boundary. No SQLite database or database-to-JSON exporter owns these files.

## Layout

```text
public/catagory/
  manifest.json
  core/
    categories.json
    subcategories.json
    collections.json
    specialty-columns.json
  pharmacy/
    categories.json
    subcategories.json
    ingredients.json
    forms.json
    strengths.json
  vehicles/
    groups.json
    options/*.json
    images/*
  schemas/*.schema.json
```

Every data file contains `schemaVersion: 3`. Array datasets use an `items` property. The manifest
is the only registry of dataset paths and public asset roots.

## Design Rules

- IDs are stable business identities and must never be renumbered for display sorting.
- Every displayable item owns mandatory `display: { order, hidden }` metadata. `order` is a
  positive integer scoped to siblings under the same parent; `hidden` is the global visibility
  switch for every runtime surface.
- Use spaced orders (`10`, `20`, `30`, ...) so an item can be inserted without renumbering its
  siblings. Duplicate sibling orders fail validation. A deterministic identity fallback is still
  applied defensively by the shared runtime policy.
- Hiding a parent cascades at runtime to every descendant. Descendants and relationships remain in
  the canonical files so visibility can be restored without data loss. Globally hidden pharmacy
  items cannot be restored by seller-specific database overrides.
- Localized display values use `{ "ar": "...", "en": "..." }`; additional locales can be added
  without changing entity identity.
- Collections own `memberCategoryIds`. Category rows do not duplicate collection names or images.
- Subcategory grouping uses a semantic `groupKey`; Doctor Appointment uses
  `doctor-appointment`, never numeric sentinel IDs.
- `core/specialty-columns.json` explicitly maps 135 selections to the 131 physical columns in
  `profile-core.user_specialties`. Display-name edits never rename database columns.
- Pharmacy ingredients own `formIds` and `strengthIds`; referential integrity is validated against
  the form and strength registries.
- Vehicle groups declare their option file, display metadata and image capability. Adding a group does not
  require editing `ProductVehicleSpecs`.
- Image paths are resolved from manifest asset roots. Consumers must not guess directories.

## Runtime Ownership

- `src/features/categories` owns core category projections and relationship resolution.
- `src/features/pharmacy-profile-catalog` owns pharmacy projections and seller overrides.
- `src/features/vehicle-catalog` owns manifest-driven vehicle loading and caching.
- `src/features/catalog-data` owns shared versioned contracts only.

All public projections use `visibleCatalogItems`. Raw loaders retain hidden records for validation
and Catalog Studio, but application services never expose them on display surfaces.

Consumers import a feature public API; they do not import another feature's raw JSON.

## Validation

```bash
npm run catalog:validate
npm run category:validate
npm run test:categories
npm run architecture:check
npm run typecheck
```

`catalog:validate` checks JSON Schema conformance, duplicate and composite identities, unique
sibling display orders, global visibility metadata, every parent
and collection relation, exact `user_specialties` schema coverage, pharmacy references and images,
vehicle option registries and images, and the presence of all published JSON Schemas.
It also runs `test:catalog-display`, which verifies the preserved Home order, shared hidden-item
filtering, ancestor visibility cascading, and runtime ordering for category, pharmacy and vehicle
projections. Therefore `dev`, `build` and `build:static` all use the same behavioral gate.

Saving tools must write a complete validated temporary file and atomically replace the canonical
file only after all cross-file validation passes. A failed edit must never leave a partially written
catalog. Catalog visibility is independent of local or cloud user records.

The implemented editor, transaction/recovery policy, image safety rules and environment guards are
documented in
[`Catalog Studio`](../../06-super-admin-and-operations/catalog-studio.md).
