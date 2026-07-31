import {
  advertisementsDataSource,
  productsDataSource,
  profilesDataSource,
  usersDataSource,
} from "@/modules/data-access/core";
import "server-only";

import { randomUUID } from "node:crypto";

import {
  DATABASE_SHARDS,
  DATABASE_SHARD_NAMES,
  type DatabaseShardName,
} from "@/modules/data-access/core/database/database-shards";
import type { IDatabaseClient } from "@/modules/data-access/core/database/database-client.interface";
import { ShardedRawDatabaseClient } from "@/modules/data-access/core/database/sharded-raw-database-client";

import { DATA_HEALTH_FACTORY_RESET_METADATA_STATEMENTS } from "@/modules/data-access/domains/data-health/db/factory-reset-metadata-schema";
import { stableHash } from "@/modules/data-health/domain/policy";

import heroSliderSeed from "@/features/advertisements/config/home-hero-slider.seed.json";
import featuredMarqueeSeed from "@/features/advertisements/config/featured-marquee.seed.json";
import trendingRibbonSeed from "@/features/advertisements/config/trending-ribbon.seed.json";

type Row = Record<string, unknown>;
type GenericDatabaseClient = Pick<IDatabaseClient, "execute">;

export const FACTORY_RESET_DOMAINS = [
  "users",
  "product",
  "advertisements",
  ...DATABASE_SHARD_NAMES,
] as const;
export type FactoryResetDomain = (typeof FACTORY_RESET_DOMAINS)[number];

const SYSTEM_TABLES = new Set(["__drizzle_migrations"]);
const FACTORY_RESET_OWN_TABLES = new Set([
  "data_health_factory_reset_plans",
  "data_health_factory_reset_locks",
  "data_health_factory_reset_audit",
]);

export interface FactoryResetDomainResult {
  domain: FactoryResetDomain;
  status: "completed" | "failed";
  deletedRows: Record<string, number>;
  error?: string;
}

export interface FactoryResetSnapshot {
  domainCounts: Record<string, Record<string, number>>;
  totalRows: number;
  imageCount: number;
  snapshotHash: string;
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function number(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function clientForDomain(domain: FactoryResetDomain): GenericDatabaseClient {
  if (domain === "users") return usersDataSource;
  if (domain === "product") return productsDataSource;
  if (domain === "advertisements") return advertisementsDataSource;
  const shard = domain as DatabaseShardName;
  return new ShardedRawDatabaseClient(
    Object.fromEntries(DATABASE_SHARDS[shard].map((table) => [table, shard])),
    shard,
  );
}

async function listTables(
  client: GenericDatabaseClient,
  excludeTables: Set<string>,
): Promise<string[]> {
  const rows = await client.execute(
    "SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'",
  );
  return rows
    .map((row) => text(row.name))
    .filter(Boolean)
    .filter((table) => !SYSTEM_TABLES.has(table) && !excludeTables.has(table));
}

export class FactoryResetRepository {
  private metadataReady?: Promise<void>;

  private ensureMetadata(): Promise<void> {
    if (!this.metadataReady) {
      this.metadataReady = (async () => {
        for (const statement of DATA_HEALTH_FACTORY_RESET_METADATA_STATEMENTS) {
          await usersDataSource.execute(statement);
        }
      })().catch((error) => {
        this.metadataReady = undefined;
        throw error;
      });
    }
    return this.metadataReady;
  }

  async snapshot(imageCount: number): Promise<FactoryResetSnapshot> {
    const domainCounts: Record<string, Record<string, number>> = {};
    let totalRows = 0;
    for (const domain of FACTORY_RESET_DOMAINS) {
      const client = clientForDomain(domain);
      const excludeTables =
        domain === "users" ? FACTORY_RESET_OWN_TABLES : new Set<string>();
      const tables = await listTables(client, excludeTables);
      const tableCounts: Record<string, number> = {};
      for (const table of tables) {
        const rows = await client.execute(
          `SELECT COUNT(*) AS count FROM ${quoteIdentifier(table)}`,
        );
        const count = number(rows[0]?.count);
        tableCounts[table] = count;
        totalRows += count;
      }
      domainCounts[domain] = tableCounts;
    }
    return {
      domainCounts,
      totalRows,
      imageCount,
      snapshotHash: stableHash({ domainCounts, imageCount }),
    };
  }

  async savePlan(input: {
    id: string;
    adminUid: string;
    environment: string;
    snapshot: FactoryResetSnapshot;
    confirmationText: string;
    createdAt: string;
    expiresAt: string;
  }) {
    await this.ensureMetadata();
    await usersDataSource.execute(
      "INSERT INTO data_health_factory_reset_plans (id, admin_uid, environment, domain_count, image_count, total_rows, domain_counts_json, snapshot_hash, confirmation_text, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        input.id,
        input.adminUid,
        input.environment,
        FACTORY_RESET_DOMAINS.length,
        input.snapshot.imageCount,
        input.snapshot.totalRows,
        JSON.stringify(input.snapshot.domainCounts),
        input.snapshot.snapshotHash,
        input.confirmationText,
        input.createdAt,
        input.expiresAt,
      ],
    );
  }

  async getPlan(id: string): Promise<Row | null> {
    await this.ensureMetadata();
    const rows = (await usersDataSource.execute(
      "SELECT * FROM data_health_factory_reset_plans WHERE id=? LIMIT 1",
      [id],
    )) as Row[];
    return rows[0] ?? null;
  }

  async finishPlan(input: {
    id: string;
    status: "completed" | "partial" | "failed";
    now: string;
    error?: string;
  }) {
    await this.ensureMetadata();
    await usersDataSource.execute(
      "UPDATE data_health_factory_reset_plans SET status=?, consumed_at=?, error_message=? WHERE id=?",
      [input.status, input.now, input.error ?? "", input.id],
    );
  }

  async acquireLock(input: {
    token: string;
    adminUid: string;
    now: string;
    lockedUntil: string;
  }): Promise<boolean> {
    await this.ensureMetadata();
    const rows = (await usersDataSource.execute(
      "INSERT INTO data_health_factory_reset_locks (id, token, owner_uid, locked_until, created_at) VALUES ('factory-reset', ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET token=excluded.token, owner_uid=excluded.owner_uid, locked_until=excluded.locked_until, created_at=excluded.created_at WHERE data_health_factory_reset_locks.locked_until<=? RETURNING token",
      [input.token, input.adminUid, input.lockedUntil, input.now, input.now],
    )) as Row[];
    return text(rows[0]?.token) === input.token;
  }

  async releaseLock(token: string) {
    await usersDataSource.execute(
      "DELETE FROM data_health_factory_reset_locks WHERE id='factory-reset' AND token=?",
      [token],
    );
  }

  async isOrderPurgeLockHeld(): Promise<boolean> {
    try {
      const rows = (await profilesDataSource.execute(
        "SELECT locked_until FROM data_health_locks WHERE id='order-purge' LIMIT 1",
      )) as Row[];
      if (rows.length === 0) return false;
      return Date.parse(text(rows[0]?.locked_until)) > Date.now();
    } catch {
      return false;
    }
  }

  async addAudit(input: {
    resetId: string;
    adminUid: string;
    environment: string;
    status: string;
    before: unknown;
    after: unknown;
    reason?: string;
  }) {
    await this.ensureMetadata();
    await usersDataSource.execute(
      "INSERT INTO data_health_factory_reset_audit (id, plan_id, admin_uid, environment, status, before_json, after_json, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        randomUUID(),
        input.resetId,
        input.adminUid,
        input.environment,
        input.status,
        JSON.stringify(input.before),
        JSON.stringify(input.after),
        input.reason ?? "",
        new Date().toISOString(),
      ],
    );
  }

  async getSuperAdminPasswordHash(uid: string): Promise<string> {
    const rows = (await usersDataSource.execute(
      "SELECT password FROM users WHERE uid=? LIMIT 1",
      [uid],
    )) as Row[];
    return text(rows[0]?.password);
  }

  async wipeDomain(domain: FactoryResetDomain): Promise<FactoryResetDomainResult> {
    try {
      const client = clientForDomain(domain);
      const excludeTables =
        domain === "users"
          ? new Set<string>(["users", ...FACTORY_RESET_OWN_TABLES])
          : new Set<string>();
      const tables = await listTables(client, excludeTables);
      const deletedRows: Record<string, number> = {};
      for (const table of tables) {
        const result = await client.execute(
          `DELETE FROM ${quoteIdentifier(table)}`,
        );
        deletedRows[table] = number(result[0]?.changes);
      }
      return { domain, status: "completed", deletedRows };
    } catch (error) {
      return {
        domain,
        status: "failed",
        deletedRows: {},
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async resetSuperAdminRow(superAdminUid: string): Promise<Row[]> {
    await usersDataSource.execute("DELETE FROM users WHERE uid<>?", [
      superAdminUid,
    ]);
    const now = new Date().toISOString();
    await usersDataSource.execute(
      "UPDATE users SET email=NULL, last_login_at=NULL, created_at=?, updated_at=?, deleted_at=NULL WHERE uid=?",
      [now, now, superAdminUid],
    );
    return (await usersDataSource.execute(
      "SELECT uid, phone FROM users",
    )) as Row[];
  }

  async reseedAdvertisements(): Promise<void> {
    const now = new Date().toISOString();
    await advertisementsDataSource.insert("hero_slider", {
      id: "home-hero-slider",
      config_json: JSON.stringify(heroSliderSeed.config),
      version: 1,
      check_interval_minutes: 15,
      updated_at: now,
    });
    await advertisementsDataSource.insert("featured_marquee", {
      id: "home-featured-marquee",
      product_ids_json: JSON.stringify(featuredMarqueeSeed.config.productIds),
      version: 1,
      check_interval_minutes: 15,
      updated_at: now,
    });
    await advertisementsDataSource.insert("trending_ribbon", {
      id: "home-trending-ribbon",
      config_json: JSON.stringify(trendingRibbonSeed),
      version: 1,
      check_interval_minutes: 15,
      updated_at: now,
    });
  }
}

export const factoryResetRepository = new FactoryResetRepository();
