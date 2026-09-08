import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DATABASE_SHARDS,
  envPrefixForShard,
  type DatabaseShardName,
} from "../core/database/database-shards";
import { runSchemaSync } from "../provisioning/core/schema-sync";
import { readEnvFiles } from "@asol/env-core/files";

/**
 * Creates the shard databases, issues their credentials, and applies the desired
 * schema. Nothing else.
 *
 * This command used to open a local shard file, drop every table in the matching
 * Turso database, recreate them from that file, clear what remained, and copy
 * local rows back in. It was named "provision" and it was a restore from a
 * developer's laptop: running it against a database that already held real rows
 * destroyed them, and the only thing standing between the two outcomes was
 * whether the operator happened to know that.
 *
 * The replacement can only add. Creating a database is idempotent, credentials
 * are re-issued, and schema arrives as additive DDL from the repository's own
 * desired manifests — which is also why no `.db` file is opened here any more.
 * Row data is never read, written, deleted, or copied by provisioning; a
 * database that already exists keeps everything it has.
 */

type TursoDatabase = { Name: string; Hostname: string; hostname?: string };

function updateEnvFile(filePath: string, entries: Record<string, string>): void {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, "utf8");
  for (const [key, value] of Object.entries(entries)) {
    const line = `${key}=${value}`;
    if (content.includes(`${key}=`)) {
      content = content.replace(new RegExp(`^${key}=.*$`, "m"), line);
    } else {
      content += `${content.endsWith("\n") ? "" : "\n"}${line}\n`;
    }
  }
  fs.writeFileSync(filePath, content, "utf8");
}

async function platformFetch<T>(
  organization: string,
  token: string,
  pathName: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`https://api.turso.tech/v1${pathName}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Turso API ${response.status}: ${await response.text()}`);
  }
  return (await response.json()) as T;
}

async function listDatabases(organization: string, token: string): Promise<TursoDatabase[]> {
  const data = await platformFetch<{ databases?: TursoDatabase[] }>(
    organization,
    token,
    `/organizations/${organization}/databases`,
  );
  return data.databases ?? [];
}

async function ensureDatabase(
  organization: string,
  token: string,
  databaseName: DatabaseShardName,
): Promise<{ database: TursoDatabase; created: boolean }> {
  const existing = (await listDatabases(organization, token)).find(
    (database) => database.Name === databaseName,
  );
  if (existing) return { database: existing, created: false };

  const data = await platformFetch<{ database: TursoDatabase }>(
    organization,
    token,
    `/organizations/${organization}/databases`,
    {
      method: "POST",
      body: JSON.stringify({ name: databaseName, group: "default" }),
    },
  );
  return { database: data.database, created: true };
}

async function createToken(
  organization: string,
  token: string,
  databaseName: string,
): Promise<string> {
  const data = await platformFetch<{ jwt: string }>(
    organization,
    token,
    `/organizations/${organization}/databases/${databaseName}/auth/tokens?expiration=never&authorization=full-access`,
    { method: "POST" },
  );
  return data.jwt;
}

export async function provisionDatabaseShards(): Promise<void> {
  const values = readEnvFiles();
  const organization = values.TURSO_ORGANIZATION;
  const apiToken = values.TURSO_API_TOKEN;
  if (!organization || !apiToken) {
    throw new Error("TURSO_ORGANIZATION and TURSO_API_TOKEN are required.");
  }

  for (const databaseName of Object.keys(DATABASE_SHARDS) as DatabaseShardName[]) {
    const { database, created } = await ensureDatabase(organization, apiToken, databaseName);
    const hostname = database.Hostname || database.hostname;
    if (!hostname) throw new Error(`Turso database hostname missing for ${databaseName}`);
    const databaseUrl = `libsql://${hostname}`;
    const authToken = await createToken(organization, apiToken, databaseName);
    const prefix = envPrefixForShard(databaseName);
    updateEnvFile(".env.local", {
      [`${prefix}_DATABASE_URL`]: databaseUrl,
      [`${prefix}_DATABASE_AUTH_TOKEN`]: authToken,
    });

    // Additive only, and against the credentials just resolved rather than the
    // environment, so provisioning a freshly created database cannot apply DDL
    // to whichever one the process happened to be pointed at.
    const report = await runSchemaSync({
      databaseLabel: databaseName,
      tursoUrl: databaseUrl,
      tursoAuthToken: authToken,
    });

    console.log(
      `${databaseName}: ${created ? "created" : "existing"}, ` +
        `${report.operations.length} schema operation(s) applied`,
    );
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  provisionDatabaseShards().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
