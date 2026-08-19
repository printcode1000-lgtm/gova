import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { resolveNotificationsSqlitePath } from "@asol/dev-core/server";
import dotenv from "dotenv";

import { createClient } from "@libsql/client";
import Database from "better-sqlite3";

const root = process.cwd();
const localPath = resolveNotificationsSqlitePath();
const migrationPath = path.join(
  root,
  'packages', 'data-core', 'src',
  "core",
  "database",
  "notifications",
  "migrations",
  "0002_one_token_per_user_platform.sql",
);

dotenv.config({ path: path.join(root, ".env.local"), quiet: true });
dotenv.config({ path: path.join(root, ".env"), quiet: true });

const statements = readFileSync(migrationPath, "utf8")
  .split("--> statement-breakpoint")
  .map((statement) => statement.trim())
  .filter(Boolean);

interface Audit {
  total: number;
  duplicateGroups: number;
}

const AUDIT_SQL = `
  SELECT
    (SELECT COUNT(*) FROM user_notification_tokens) AS total,
    (SELECT COUNT(*) FROM (
      SELECT uid, platform
      FROM user_notification_tokens
      GROUP BY uid, platform
      HAVING COUNT(*) > 1
    )) AS duplicate_groups
`;

function auditLocal(db: Database.Database): Audit {
  const row = db.prepare(AUDIT_SQL).get() as {
    total: number;
    duplicate_groups: number;
  };
  return {
    total: Number(row.total),
    duplicateGroups: Number(row.duplicate_groups),
  };
}

async function auditCloud(
  client: ReturnType<typeof createClient>,
): Promise<Audit> {
  const result = await client.execute(AUDIT_SQL);
  const row = result.rows[0]!;
  return {
    total: Number(row.total),
    duplicateGroups: Number(row.duplicate_groups),
  };
}

function cleanLocal(): { before: Audit; after: Audit } | null {
  if (!existsSync(localPath)) return null;
  const db = new Database(localPath);
  try {
    const table = db
      .prepare(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'user_notification_tokens'",
      )
      .get();
    if (!table) return null;
    const before = auditLocal(db);
    db.transaction(() => {
      for (const statement of statements) db.exec(statement);
    })();
    return { before, after: auditLocal(db) };
  } finally {
    db.close();
  }
}

async function cleanCloud(): Promise<{ before: Audit; after: Audit } | null> {
  const url = process.env.TURSO_NOTIFICATIONS_DATABASE_URL;
  const authToken = process.env.TURSO_NOTIFICATIONS_AUTH_TOKEN;
  if (!url || !authToken) return null;
  const client = createClient({ url, authToken });
  try {
    const table = await client.execute(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'user_notification_tokens'",
    );
    if (table.rows.length === 0) return null;
    const before = await auditCloud(client);
    await client.batch(
      statements.map((sql) => ({ sql, args: [] })),
      "write",
    );
    return { before, after: await auditCloud(client) };
  } finally {
    client.close();
  }
}

async function main(): Promise<void> {
  const local = cleanLocal();
  const cloud = await cleanCloud();
  console.log(JSON.stringify({ local, cloud }, null, 2));
  for (const result of [local, cloud]) {
    if (result && result.after.duplicateGroups !== 0) {
      throw new Error("notificationTokenCardinalityCleanupFailed");
    }
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
