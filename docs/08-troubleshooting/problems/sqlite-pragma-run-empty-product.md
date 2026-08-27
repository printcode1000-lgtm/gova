# Every SQLite-backed product reads back empty (`PRAGMA` executed with `run()`)

## Symptom

In development (`dataSource: "local"` → the SQLite backend), `GET /api/products?id=<existing id>`
answers **200** with a fully blank `ProductRecord`:

```json
{ "id": "", "uid": "", "status": "active", "mainData": { "name": "" }, "images": [] }
```

A non-existent id still answers **404 `productNotFound`**, and the row itself is
intact on disk:

```
sqlite3 public/sync_data/sync_sqlite/product.db \
  "select id, main_name, price_current from products where id='…';"
aec0f74b-…|اسم المنتج|200
```

Downstream this surfaces as missing product data rather than an error. On
`/super-admin/featured-marquee` the selected product resolves "successfully",
so it is never reported as not found, but its name, price and image are empty
and the live preview renders empty cards.

## Cause

`ProductRepository.findById` builds its column list from
`PRAGMA table_info(products)`, and `productSelectColumns` substitutes a literal
fallback (`'' AS id`, `'active' AS status`, `'[]' AS images_json`, …) for every
column that introspection did not report.

The SQLite clients decided how to run a statement by sniffing the SQL text:

```ts
sql.trim().toUpperCase().startsWith("SELECT") || /\bRETURNING\b/i.test(sql)
  ? statement.all(...params)
  : [statement.run(...params)];
```

`PRAGMA …` matches neither branch, so it went through `run()`. better-sqlite3
answers `run()` on a row-returning statement with `{ changes: 0, lastInsertRowid: 0 }`
instead of the rows — no exception. Introspection therefore returned **zero**
column names, every column fell back to a literal, and the resulting
`SELECT '' AS id, … FROM products WHERE id = ?` still matched the real row and
returned one row of constants. Hence: 200, one record, no data.

## Fix

Ask the driver instead of the SQL text. better-sqlite3 exposes
`Statement#reader`, which is true for SELECT, PRAGMA and RETURNING alike.
`packages/data-core/src/core/database/sqlite-statement-execution.ts` owns that
single decision and all four SQLite clients (primary, product, advertisements,
notifications) route `rawExecute` through it.

The Turso clients were never affected: libSQL returns `result.rows` for a
`PRAGMA` like any other statement.

## Verification

- Dev server must be restarted after the change: Turbopack does not hot-reload
  edits under `packages/` into an already-running `next dev`.
- `GET /api/products?id=<existing id>` returns the real row.
