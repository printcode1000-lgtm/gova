import { existsSync } from "fs";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import { createClient } from "@libsql/client";
import { PRIMARY_SQLITE_DB_PATH } from "../core/database/environment";
import { normalizeAuthPhone } from "@asol/auth-core/server";

process.env.ASOL_PROVISIONING = "true";

if (existsSync(".env.local")) {
  dotenv.config({ path: ".env.local" });
}
dotenv.config({ path: ".env" });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required");
}

const sqlite = new Database(PRIMARY_SQLITE_DB_PATH, { readonly: true });
const turso = createClient({ url, authToken });

type UserRow = {
  uid: string;
  phone: string;
  email: string | null;
  password: string;
  last_login_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

async function main() {
  const users = sqlite
    .prepare(
      "SELECT uid, phone, email, password, last_login_at, created_at, updated_at, deleted_at FROM users",
    )
    .all() as UserRow[];

  let inserted = 0;
  let updated = 0;

  for (const user of users) {
    const phone = normalizeAuthPhone(user.phone);
    const existing = await turso.execute({
      sql: "SELECT uid FROM users WHERE uid = ? OR phone = ? LIMIT 1",
      args: [user.uid, phone],
    });

    const args = [
      user.uid,
      phone,
      user.email,
      user.password,
      user.last_login_at,
      user.created_at,
      user.updated_at,
      user.deleted_at,
    ];

    if (existing.rows.length > 0) {
      await turso.execute({
        sql: `
          UPDATE users
          SET uid = ?, phone = ?, email = ?, password = ?, last_login_at = ?,
              created_at = ?, updated_at = ?, deleted_at = ?
          WHERE uid = ? OR phone = ?
        `,
        args: [...args, user.uid, phone],
      });
      updated += 1;
    } else {
      await turso.execute({
        sql: `
          INSERT INTO users (
            uid, phone, email, password, last_login_at,
            created_at, updated_at, deleted_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args,
      });
      inserted += 1;
    }
  }

  console.log(
    `Users synced from SQLite to Turso: ${inserted} inserted, ${updated} updated`,
  );
}

main()
  .finally(() => sqlite.close())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
