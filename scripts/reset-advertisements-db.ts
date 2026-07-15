import { existsSync } from "node:fs";
import path from "node:path";

import { createClient } from "@libsql/client";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { ADVERTISEMENTS_SQLITE_DB_PATH } from "../src/core/database/environment";
import { loadTursoAdvertisementsCredentialsFromEnv } from "../src/core/provisioning/turso-provisioner";
import seed from "../src/features/advertisements/config/home-hero-slider.seed.json";

process.env.ASOL_PROVISIONING = "true";
if (existsSync(".env")) dotenv.config({ path: ".env" });
if (existsSync(".env.local")) dotenv.config({ path: ".env.local" });

const DROP_TABLES = [
  "advertisement_image_cleanup",
  "hero_slider_publications",
  "hero_slider_slides",
  "hero_sliders",
  "hero_slider",
  "featured_marquee",
  "trending_ribbon",
];

const CREATE_HERO_SLIDER = `
CREATE TABLE hero_slider (
  id TEXT PRIMARY KEY NOT NULL,
  config_json TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  check_interval_minutes INTEGER NOT NULL DEFAULT 15,
  updated_at TEXT NOT NULL,
  updated_by TEXT
)`;

const CREATE_FEATURED_MARQUEE = `
CREATE TABLE featured_marquee (
  id TEXT PRIMARY KEY NOT NULL,
  product_ids_json TEXT NOT NULL DEFAULT '[]',
  version INTEGER NOT NULL DEFAULT 1,
  check_interval_minutes INTEGER NOT NULL DEFAULT 15,
  updated_at TEXT NOT NULL,
  updated_by TEXT
)`;

const CREATE_TRENDING_RIBBON = `
CREATE TABLE trending_ribbon (
  id TEXT PRIMARY KEY NOT NULL,
  config_json TEXT NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  check_interval_minutes INTEGER NOT NULL DEFAULT 15,
  updated_at TEXT NOT NULL,
  updated_by TEXT
)`;

function resetLocal(): void {
  const db = new Database(ADVERTISEMENTS_SQLITE_DB_PATH);
  try {
    db.pragma("foreign_keys = OFF");
    db.transaction(() => {
      for (const table of DROP_TABLES) db.exec(`DROP TABLE IF EXISTS ${table}`);
      db.exec("DROP TABLE IF EXISTS __drizzle_migrations");
    })();
    migrate(drizzle(db), {
      migrationsFolder: path.join(
        process.cwd(),
        "src/core/database/advertisements/migrations",
      ),
    });
    db.prepare(
      "INSERT INTO hero_slider (id, config_json, version, check_interval_minutes, updated_at) VALUES (?, ?, 1, 15, ?)",
    ).run(
      "home-hero-slider",
      JSON.stringify(seed.config),
      new Date().toISOString(),
    );
    db.prepare(
      "INSERT INTO featured_marquee (id, product_ids_json, version, check_interval_minutes, updated_at) VALUES (?, '[]', 1, 15, ?)",
    ).run("home-featured-marquee", new Date().toISOString());
    db.prepare(
      "INSERT INTO trending_ribbon (id, config_json, version, check_interval_minutes, updated_at) VALUES (?, ?, 1, 15, ?)",
    ).run(
      "home-trending-ribbon",
      JSON.stringify({ label: "home.trending.label", items: [] }),
      new Date().toISOString(),
    );
  } finally {
    db.close();
  }
  console.log(`Advertisements SQLite reset: ${ADVERTISEMENTS_SQLITE_DB_PATH}`);
}

async function resetCloud(): Promise<void> {
  const credentials = loadTursoAdvertisementsCredentialsFromEnv();
  if (!credentials) {
    console.log(
      "Advertisements Turso reset skipped: credentials are not configured",
    );
    return;
  }
  const client = createClient(credentials);
  try {
    await client.execute("PRAGMA foreign_keys = OFF");
    for (const table of DROP_TABLES) {
      await client.execute(`DROP TABLE IF EXISTS ${table}`);
    }
    await client.execute(CREATE_HERO_SLIDER);
    await client.execute(CREATE_FEATURED_MARQUEE);
    await client.execute({
      sql: "INSERT INTO hero_slider (id, config_json, version, check_interval_minutes, updated_at) VALUES (?, ?, 1, 15, ?)",
      args: [
        "home-hero-slider",
        JSON.stringify(seed.config),
        new Date().toISOString(),
      ],
    });
    await client.execute({
      sql: "INSERT INTO featured_marquee (id, product_ids_json, version, check_interval_minutes, updated_at) VALUES (?, '[]', 1, 15, ?)",
      args: ["home-featured-marquee", new Date().toISOString()],
    });
    await client.execute(CREATE_TRENDING_RIBBON);
    await client.execute({
      sql: "INSERT INTO trending_ribbon (id, config_json, version, check_interval_minutes, updated_at) VALUES (?, ?, 1, 15, ?)",
      args: [
        "home-trending-ribbon",
        JSON.stringify({ label: "home.trending.label", items: [] }),
        new Date().toISOString(),
      ],
    });
  } finally {
    client.close();
  }
  console.log("Advertisements Turso reset complete");
}

async function main() {
  resetLocal();
  if (process.argv.includes("--cloud")) await resetCloud();
}

main().catch((error) => {
  console.error("Advertisements reset failed:", error);
  process.exit(1);
});
