import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { createClient } from "@libsql/client";
import dotenv from "dotenv";

import { loadTursoAdvertisementsCredentialsFromEnv } from "../provisioning/core/turso-provisioner";

/** Seed lives in the app tree; tooling loads it by path (no `@/` import). */
const seedPath = path.join(
  process.cwd(),
  "src/features/advertisements/application/config/home-hero-slider.seed.json",
);
const seed = JSON.parse(readFileSync(seedPath, "utf8")) as {
  config: unknown;
};

process.env.ASOL_PROVISIONING = "true";
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

/**
 * A reset drops the advertisements tables and re-seeds them. There is one copy
 * of that data, so `--cloud` is not a second target: it is the acknowledgement
 * that this destroys what the live advertisements database currently holds.
 */
async function main() {
  if (!process.argv.includes("--cloud")) {
    console.log(
      "Refusing to reset without --cloud. This drops and re-seeds the live advertisements database.",
    );
    return;
  }
  await resetCloud();
}

main().catch((error) => {
  console.error("Advertisements reset failed:", error);
  process.exit(1);
});
