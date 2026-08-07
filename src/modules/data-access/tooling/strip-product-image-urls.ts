/**
 * Rewrites `products.images_json` to hold image keys only.
 *
 * Rows used to store `{ imageKey, url }`, which baked the bucket's public
 * hostname into the data — moving the bucket then meant rewriting every row,
 * which this project has already had to do once. The URL is now derived on read
 * from whichever bucket the `product-default` storage profile points at.
 *
 * Idempotent: a row already in the new shape is left alone. Runs against the
 * local SQLite database and the Turso product database.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import { createClient, type Client } from "@libsql/client";

if (existsSync(".env.local")) dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });

const LOCAL_PATH = path.join("public", "sync_data", "sync_sqlite", "product.db");

interface Row {
  id: string;
  images_json: string;
}

/** Returns the key-only JSON, or null when the row already has that shape. */
function stripped(imagesJson: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(imagesJson || "[]");
  } catch {
    return "[]";
  }
  if (!Array.isArray(parsed)) return "[]";

  const keys = parsed
    .filter(
      (image): image is { imageKey: string } =>
        typeof (image as { imageKey?: unknown })?.imageKey === "string",
    )
    .map((image) => ({ imageKey: image.imageKey }));

  const next = JSON.stringify(keys);
  return next === imagesJson ? null : next;
}

function migrateLocal(): number {
  if (!existsSync(LOCAL_PATH)) {
    console.log(`  local: ${LOCAL_PATH} not found, skipped`);
    return 0;
  }
  const db = new Database(LOCAL_PATH);
  const rows = db
    .prepare("SELECT id, images_json FROM products")
    .all() as Row[];
  const update = db.prepare("UPDATE products SET images_json = ? WHERE id = ?");
  let changed = 0;
  for (const row of rows) {
    const next = stripped(row.images_json);
    if (next === null) continue;
    update.run(next, row.id);
    changed += 1;
  }
  db.close();
  console.log(`  local: ${changed} of ${rows.length} row(s) rewritten`);
  return changed;
}

async function migrateRemote(): Promise<number> {
  const url = process.env.TURSO_PRODUCT_DATABASE_URL;
  const authToken = process.env.TURSO_PRODUCT_AUTH_TOKEN;
  if (!url || !authToken) {
    console.log("  turso: TURSO_PRODUCT_* not set, skipped");
    return 0;
  }
  const client: Client = createClient({ url, authToken });
  const result = await client.execute("SELECT id, images_json FROM products");
  let changed = 0;
  for (const row of result.rows) {
    const id = String(row.id);
    const imagesJson = String(row.images_json ?? "[]");
    const next = stripped(imagesJson);
    if (next === null) continue;
    await client.execute({
      sql: "UPDATE products SET images_json = ? WHERE id = ?",
      args: [next, id],
    });
    changed += 1;
  }
  client.close();
  console.log(`  turso: ${changed} of ${result.rows.length} row(s) rewritten`);
  return changed;
}

async function main(): Promise<void> {
  console.log("Stripping URLs from products.images_json:");
  migrateLocal();
  await migrateRemote();
  console.log("Done. URLs are now resolved on read from the storage profile.");
}

void main();
