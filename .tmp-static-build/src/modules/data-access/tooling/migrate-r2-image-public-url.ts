import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import { createClient, type Client, type InStatement } from "@libsql/client";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const OLD_PUBLIC_URL = (
  process.env.OLD_R2_PUBLIC_URL ||
  process.env.R2_MIGRATION_SOURCE_PUBLIC_URL ||
  ""
).replace(/\/$/, "");

const NEW_PUBLIC_URL = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");

const extraUrls = (process.env.R2_MIGRATION_EXTRA_URLS || "")
  .split(/[,\n]/)
  .map((value) => value.trim())
  .filter(Boolean);

const URL_PATTERN = /https:\/\/pub-[a-z0-9]+\.r2\.dev\/[^\s"'`<>)]*/gi;
const NETWORK_TIMEOUT_MS = 20_000;

const targets = [
  { dbPrefix: "TURSO_PRODUCT", sqliteFile: "product.db", table: "products", id: "id", columns: ["images_json"] },
  { dbPrefix: "TURSO_PRODUCT", sqliteFile: "product.db", table: "product_reviews", id: "id", columns: ["reviewer_avatar_url"] },
  { dbPrefix: "PROFILE_SOCIAL", sqliteFile: "profile-social.db", table: "profile_reviews", id: "id", columns: ["reviewer_avatar_url"] },
  { dbPrefix: "PROFILE_CATALOG", sqliteFile: "profile-catalog.db", table: "pharmacy_profile_product_overrides", id: "id", columns: ["image_url"] },
  { dbPrefix: "ORDERS_ITEMS", sqliteFile: "orders-items.db", table: "custom_request_images", id: "id", columns: ["image_url"] },
  { dbPrefix: "TURSO_ADVERTISEMENTS", sqliteFile: "advertisements.db", table: "hero_slider", id: "id", columns: ["config_json"] },
  { dbPrefix: "TURSO_ADVERTISEMENTS", sqliteFile: "advertisements.db", table: "trending_ribbon", id: "id", columns: ["config_json"] },
] as const;

type Target = (typeof targets)[number];

interface MigrationSummary {
  copied: number;
  reused: number;
  failedCopies: Array<{ url: string; reason: string }>;
  localUpdates: number;
  tursoUpdates: number;
}

const summary: MigrationSummary = {
  copied: 0,
  reused: 0,
  failedCopies: [],
  localUpdates: 0,
  tursoUpdates: 0,
};

const copiedUrls = new Map<string, string>();
let uploadR2ObjectRef:
  | ((key: string, body: Buffer, contentType?: string) => Promise<{ publicUrl: string }>)
  | null = null;

async function uploadToNewR2(key: string, body: Buffer, contentType: string): Promise<void> {
  if (!uploadR2ObjectRef) {
    const r2ClientModule = await import("@/core/provisioning/r2-s3-client");
    uploadR2ObjectRef = r2ClientModule.uploadR2Object;
  }
  await uploadR2ObjectRef(key, body, contentType);
}

function requireConfig(): void {
  if (!NEW_PUBLIC_URL) throw new Error("R2_PUBLIC_URL environment variable is required");
  if (!OLD_PUBLIC_URL) {
    throw new Error("OLD_R2_PUBLIC_URL or R2_MIGRATION_SOURCE_PUBLIC_URL is required");
  }
  if (OLD_PUBLIC_URL === NEW_PUBLIC_URL) {
    throw new Error("Old and new R2 public URLs are identical; migration would do nothing");
  }
}

function isOldUrl(url: string): boolean {
  return url.startsWith(`${OLD_PUBLIC_URL}/`);
}

function keyFromOldUrl(url: string): string {
  return decodeURI(url.slice(OLD_PUBLIC_URL.length + 1));
}

function newUrlForKey(key: string): string {
  return `${NEW_PUBLIC_URL}/${key.replace(/^\/+/, "")}`;
}

async function copyOldUrl(url: string): Promise<string | null> {
  if (!isOldUrl(url)) return null;
  const existing = copiedUrls.get(url);
  if (existing) {
    summary.reused += 1;
    return existing;
  }

  const key = keyFromOldUrl(url);
  const targetUrl = newUrlForKey(key);
  console.log(`copy ${key}`);
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
  });
  if (!response.ok) {
    summary.failedCopies.push({ url, reason: `source returned ${response.status}` });
    return null;
  }

  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const body = Buffer.from(await response.arrayBuffer());
  await uploadToNewR2(key, body, contentType);

  copiedUrls.set(url, targetUrl);
  summary.copied += 1;
  return targetUrl;
}

async function migrateText(value: string): Promise<{ value: string; changed: boolean }> {
  const urls = [...new Set(value.match(URL_PATTERN) ?? [])].filter(isOldUrl);
  let next = value;
  let changed = false;

  for (const url of urls) {
    const replacement = await copyOldUrl(url);
    if (!replacement) continue;
    next = next.split(url).join(replacement);
    changed = true;
  }

  return { value: next, changed };
}

function sqliteTableExists(db: Database.Database, table: string): boolean {
  const row = db
    .prepare("SELECT 1 ok FROM sqlite_master WHERE type='table' AND name=? LIMIT 1")
    .get(table);
  return Boolean(row);
}

async function migrateSqliteTarget(target: Target): Promise<void> {
  const dbPath = path.join(process.cwd(), "public", "sync_data", "sync_sqlite", target.sqliteFile);
  if (!existsSync(dbPath)) return;

  const db = new Database(dbPath);
  try {
    console.log(`scan sqlite ${target.sqliteFile}:${target.table}`);
    if (!sqliteTableExists(db, target.table)) return;
    for (const column of target.columns) {
      const rows = db
        .prepare(
          `SELECT ${JSON.stringify(target.id)} id, ${JSON.stringify(column)} value FROM ${JSON.stringify(
            target.table,
          )} WHERE ${JSON.stringify(column)} LIKE ?`,
        )
        .all(`%${OLD_PUBLIC_URL}%`) as Array<{ id: unknown; value: unknown }>;

      for (const row of rows) {
        const current = String(row.value ?? "");
        const migrated = await migrateText(current);
        if (!migrated.changed) continue;
        db.prepare(
          `UPDATE ${JSON.stringify(target.table)} SET ${JSON.stringify(column)}=? WHERE ${JSON.stringify(
            target.id,
          )}=?`,
        ).run(migrated.value, row.id);
        summary.localUpdates += 1;
      }
    }
  } finally {
    db.close();
  }
}

function credentialsFor(prefix: string): { url: string; authToken: string } | null {
  const url = process.env[`${prefix}_DATABASE_URL`];
  const authToken =
    process.env[`${prefix}_DATABASE_AUTH_TOKEN`] || process.env[`${prefix}_AUTH_TOKEN`];
  if (!url || !authToken) return null;
  return { url, authToken };
}

async function tursoTableExists(client: Client, table: string): Promise<boolean> {
  const result = await tursoExecuteWithTimeout(client, {
    sql: "SELECT 1 ok FROM sqlite_master WHERE type='table' AND name=? LIMIT 1",
    args: [table],
  });
  return result.rows.length > 0;
}

function tursoExecuteWithTimeout(
  client: Client,
  statement: InStatement,
): ReturnType<Client["execute"]> {
  return Promise.race([
    client.execute(statement),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Turso request timed out")), NETWORK_TIMEOUT_MS),
    ),
  ]) as ReturnType<Client["execute"]>;
}

async function migrateTursoTarget(target: Target): Promise<void> {
  const creds = credentialsFor(target.dbPrefix);
  if (!creds) return;

  const client = createClient(creds);
  console.log(`scan turso ${target.dbPrefix}:${target.table}`);
  if (!(await tursoTableExists(client, target.table))) return;

  for (const column of target.columns) {
    const rows = await tursoExecuteWithTimeout(client, {
      sql: `SELECT ${JSON.stringify(target.id)} id, ${JSON.stringify(column)} value FROM ${JSON.stringify(
        target.table,
      )} WHERE ${JSON.stringify(column)} LIKE ?`,
      args: [`%${OLD_PUBLIC_URL}%`],
    });

    for (const row of rows.rows) {
      const current = String(row.value ?? "");
      const migrated = await migrateText(current);
      if (!migrated.changed) continue;
      await tursoExecuteWithTimeout(client, {
        sql: `UPDATE ${JSON.stringify(target.table)} SET ${JSON.stringify(column)}=? WHERE ${JSON.stringify(
          target.id,
        )}=?`,
        args: [migrated.value, row.id as string],
      });
      summary.tursoUpdates += 1;
    }
  }
}

async function migrateExtraUrls(): Promise<void> {
  for (const url of extraUrls) {
    await copyOldUrl(url);
  }
}

async function main(): Promise<void> {
  requireConfig();
  for (const target of targets) {
    await migrateSqliteTarget(target);
    await migrateTursoTarget(target);
  }
  await migrateExtraUrls();

  const sqliteFiles = readdirSync(path.join(process.cwd(), "public", "sync_data", "sync_sqlite"))
    .filter((name) => name.endsWith(".db"))
    .length;

  console.log(
    JSON.stringify(
      {
        oldPublicUrl: OLD_PUBLIC_URL,
        newPublicUrl: NEW_PUBLIC_URL,
        sqliteFilesScanned: sqliteFiles,
        ...summary,
      },
      null,
      2,
    ),
  );

  if (summary.failedCopies.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
