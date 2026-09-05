# Favorites storage contract fails after feature-layer refactor

## Symptom

`npm run test:favorites-core` fails with `ENOENT` while reading:

```text
src/features/favorites/services/favorite-storage.ts
```

The favorites implementation itself may still be valid.

## Root cause

The favorites feature was reorganized into application/domain/presentation layers and the storage implementation moved to `application/services/favorite-storage.ts`. The storage contract test retained the old physical path, so a valid refactor broke the test before its actual assertions ran.

## Fix

The contract no longer depends on one internal directory. It scans `@asol/favorites-core` for the single `favorite-storage.ts` implementation, asserts that exactly one exists, verifies that it uses `ASOL_DB_STORES.FAVORITES` and the scoped favorites key, and verifies that `FavoritesProvider` imports that storage implementation.

This preserves the architectural contract while allowing internal layer moves that keep the same responsibility and wiring.

## Verification

Run:

```bash
npm run test:favorites-core
npm run architecture:check
```
