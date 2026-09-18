import { fileURLToPath } from "node:url";

import { readEnvFiles } from "@asol/env-core/files";
import { getAllStorageAccounts } from "@asol/storage-core";

import { OTA_R2_CLOUD_ACCOUNT } from "../src/features/super-admin/server/services/cloud-accounts-ota-account";

const CLOUDFLARE_API_BASE_URL = "https://api.cloudflare.com/client/v4";
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const R2_ANALYTICS_PERMISSIONS = ["Account Analytics Read", "Workers R2 Storage Read"] as const;

type EnvMap = Readonly<Record<string, string | undefined>>;

export type CloudflareAccount = {
  readonly id: string;
  readonly label: string;
  readonly accountId: string | null;
  readonly accountIdEnvVar: string;
  readonly email: string;
  readonly bucketName: string | null;
  readonly publicUrl: string | null;
  readonly tokenEnvVar: string;
};

type ParsedArgs = {
  readonly command: string | null;
  readonly flags: Readonly<Record<string, string | true>>;
};

type CloudflareApiEnvelope<T = unknown> = {
  readonly success?: boolean;
  readonly errors?: readonly { readonly message?: string; readonly code?: number }[];
  readonly messages?: readonly { readonly message?: string; readonly code?: number }[];
  readonly result?: T;
};

export class CloudflareControlError extends Error {}

function readFlagValue(args: readonly string[], index: number, key: string): [string | true, number] {
  const inlinePrefix = `--${key}=`;
  const current = args[index]!;
  if (current.startsWith(inlinePrefix)) return [current.slice(inlinePrefix.length), index];
  const next = args[index + 1];
  if (!next || next.startsWith("--")) return [true, index];
  return [next, index + 1];
}

export function parseArgs(args: readonly string[]): ParsedArgs {
  const flags: Record<string, string | true> = {};
  let command: string | null = null;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    if (arg.startsWith("--")) {
      const key = arg.slice(2).split("=", 1)[0]!;
      const [value, consumedIndex] = readFlagValue(args, index, key);
      flags[key] = value;
      index = consumedIndex;
      continue;
    }
    if (!command) command = arg;
  }
  return { command, flags };
}

function flagString(flags: ParsedArgs["flags"], key: string): string | null {
  const value = flags[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function hasFlag(flags: ParsedArgs["flags"], key: string): boolean {
  return flags[key] === true || flags[key] === "true";
}

function firstPresentEnv(env: EnvMap, ...keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = env[key]?.trim();
    if (value) return value;
  }
  return null;
}

export function listCloudflareAccounts(): readonly CloudflareAccount[] {
  return [
    ...getAllStorageAccounts().map((account) => ({
      id: account.id,
      label: account.id,
      accountId: account.accountId,
      accountIdEnvVar: `${account.envPrefix}_ACCOUNT_ID`,
      email: account.email,
      bucketName: account.bucketName,
      publicUrl: account.publicUrl,
      tokenEnvVar: `${account.envPrefix}_API_TOKEN`,
    })),
    {
      id: OTA_R2_CLOUD_ACCOUNT.id,
      label: OTA_R2_CLOUD_ACCOUNT.id,
      accountId: null,
      accountIdEnvVar: `${OTA_R2_CLOUD_ACCOUNT.envPrefix}_ACCOUNT_ID`,
      email: OTA_R2_CLOUD_ACCOUNT.email,
      bucketName: OTA_R2_CLOUD_ACCOUNT.bucketName,
      publicUrl: OTA_R2_CLOUD_ACCOUNT.publicUrl,
      tokenEnvVar: `${OTA_R2_CLOUD_ACCOUNT.envPrefix}_API_TOKEN`,
    },
  ];
}

function accountMatches(account: CloudflareAccount, selector: string): boolean {
  const normalized = selector.toLowerCase();
  return [
    account.id,
    account.label,
    account.email,
    account.accountId ?? "",
    account.bucketName ?? "",
  ].some((value) => value.toLowerCase() === normalized);
}

export function resolveCloudflareAccount(selector: string | null): CloudflareAccount {
  const accounts = listCloudflareAccounts();
  if (!selector) {
    throw new CloudflareControlError(
      `Missing --account. Known accounts: ${accounts.map((account) => account.id).join(", ")}.`,
    );
  }
  const account = accounts.find((candidate) => accountMatches(candidate, selector));
  if (!account) {
    throw new CloudflareControlError(
      `Unknown Cloudflare account "${selector}". Known accounts: ${accounts.map((candidate) => candidate.id).join(", ")}.`,
    );
  }
  return account;
}

function resolveAccountId(account: CloudflareAccount, env: EnvMap): string {
  const envValue = firstPresentEnv(env, account.accountIdEnvVar);
  const accountId = envValue ?? account.accountId;
  if (!accountId || accountId.includes("…")) {
    throw new CloudflareControlError(`Missing usable Cloudflare account id. Set ${account.accountIdEnvVar}.`);
  }
  return accountId;
}

function resolveToken(account: CloudflareAccount, env: EnvMap): string {
  const token = firstPresentEnv(env, account.tokenEnvVar);
  if (!token) throw new CloudflareControlError(`Missing Cloudflare API token. Set ${account.tokenEnvVar}.`);
  return token;
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function table(rows: readonly Readonly<Record<string, unknown>>[]): string {
  if (rows.length === 0) return "No rows.\n";
  const headers = Object.keys(rows[0]!);
  const widths = headers.map((header) =>
    Math.max(header.length, ...rows.map((row) => String(row[header] ?? "").length)),
  );
  const renderRow = (values: readonly string[]) =>
    values.map((value, index) => value.padEnd(widths[index]!)).join("  ").trimEnd();
  return [
    renderRow(headers),
    renderRow(widths.map((width) => "-".repeat(width))),
    ...rows.map((row) => renderRow(headers.map((header) => String(row[header] ?? "")))),
  ].join("\n") + "\n";
}

function formatOutput(value: unknown, flags: ParsedArgs["flags"]): string {
  return hasFlag(flags, "json")
    ? json(value)
    : Array.isArray(value) && value.every((row) => row && typeof row === "object" && !Array.isArray(row))
      ? table(value as readonly Readonly<Record<string, unknown>>[])
      : json(value);
}

function redactAuthorization(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(redactAuthorization);
  if (!input || typeof input !== "object") return input;
  const sensitiveField = /^(authorization|token|apiToken|api_token|secret|accessToken|access_token|refreshToken|refresh_token|accessKeyId|access_key_id|secretAccessKey|secret_access_key)$/i;
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>).map(([key, value]) => [
      key,
      sensitiveField.test(key) ? "[redacted]" : redactAuthorization(value),
    ]),
  );
}

async function cloudflareRequest<T>(
  account: CloudflareAccount,
  env: EnvMap,
  method: string,
  pathname: string,
  options: { readonly query?: URLSearchParams; readonly body?: unknown; readonly confirmed?: boolean } = {},
): Promise<CloudflareApiEnvelope<T>> {
  const normalizedMethod = method.toUpperCase();
  if (WRITE_METHODS.has(normalizedMethod) && !options.confirmed) {
    throw new CloudflareControlError(`Refusing ${normalizedMethod} without --confirm.`);
  }
  const accountId = resolveAccountId(account, env);
  const token = resolveToken(account, env);
  const url = new URL(`${CLOUDFLARE_API_BASE_URL}${pathname.replaceAll("{account_id}", accountId)}`);
  if (options.query) {
    for (const [key, value] of options.query) url.searchParams.set(key, value);
  }
  const response = await fetch(url, {
    method: normalizedMethod,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as CloudflareApiEnvelope<T>) : {};
  if (!response.ok || payload.success === false) {
    const details = payload.errors?.map((error) => error.message ?? error.code).join("; ") || text;
    throw new CloudflareControlError(`Cloudflare API ${normalizedMethod} ${url.pathname} failed: ${details}`);
  }
  return payload;
}

async function verifyAccountToken(account: CloudflareAccount, env: EnvMap) {
  const accountId = resolveAccountId(account, env);
  const payload = await cloudflareRequest<{ readonly buckets?: readonly unknown[] }>(
    account,
    env,
    "GET",
    "/accounts/{account_id}/r2/buckets",
  );
  return {
    account: account.id,
    accountId,
    tokenEnv: account.tokenEnvVar,
    status: "ok",
    r2BucketsVisible: payload.result?.buckets?.length ?? null,
  };
}

async function verifyR2Analytics(account: CloudflareAccount, env: EnvMap) {
  if (!account.bucketName) throw new CloudflareControlError(`Account ${account.id} has no R2 bucket.`);
  const accountId = resolveAccountId(account, env);
  const token = resolveToken(account, env);
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const response = await fetch(`${CLOUDFLARE_API_BASE_URL}/graphql`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `
query R2AnalyticsPermissionCheck($accountTag: string!, $startDate: Time, $endDate: Time, $bucketName: string) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      r2OperationsAdaptiveGroups(
        limit: 1
        filter: { datetime_geq: $startDate, datetime_leq: $endDate, bucketName: $bucketName }
      ) {
        sum { requests }
        dimensions { actionType }
      }
    }
  }
}`,
      variables: {
        accountTag: accountId,
        startDate: start.toISOString(),
        endDate: now.toISOString(),
        bucketName: account.bucketName,
      },
    }),
  });
  const payload = (await response.json()) as {
    readonly data?: unknown;
    readonly errors?: readonly { readonly message?: string }[];
  };
  if (!response.ok || payload.errors?.length) {
    return {
      account: account.id,
      accountId,
      bucket: account.bucketName,
      status: "missing-graphql-analytics-permission",
      tokenEnv: account.tokenEnvVar,
      requiredPermissions: R2_ANALYTICS_PERMISSIONS,
      message: payload.errors?.map((error) => error.message).filter(Boolean).join("; ") || `HTTP ${response.status}`,
    };
  }
  return {
    account: account.id,
    accountId,
    bucket: account.bucketName,
    status: "ok",
    tokenEnv: account.tokenEnvVar,
    requiredPermissions: R2_ANALYTICS_PERMISSIONS,
    message: null,
  };
}

function helpText(): string {
  return `Cloudflare control CLI

Usage:
  npm run cloudflare:control -- accounts:list [--json]
  npm run cloudflare:control -- token:verify --account <id>
  npm run cloudflare:control -- r2:analytics:verify --account <id>
  npm run cloudflare:control -- r2:buckets:list --account <id>
  npm run cloudflare:control -- r2:objects:list --account <id> [--bucket <name>] [--prefix <prefix>] [--limit <n>]
  npm run cloudflare:control -- r2:object:delete --account <id> --key <object-key> [--bucket <name>] --confirm
  npm run cloudflare:control -- api:request --account <id> --method <GET|POST|PUT|PATCH|DELETE> --path </accounts/{account_id}/...> [--body-json <json>] [--confirm]

Account ids come from /dev/cloud-accounts sources. Secrets are read from .env.local by env var name only.
`;
}

function objectRows(accounts: readonly CloudflareAccount[], env: EnvMap) {
  return accounts.map((account) => ({
    id: account.id,
    email: account.email,
    bucket: account.bucketName ?? "",
    accountId: firstPresentEnv(env, account.accountIdEnvVar) ? "env-present" : account.accountId ? "registry" : "missing",
    token: firstPresentEnv(env, account.tokenEnvVar) ? "present" : "missing",
    accountIdEnv: account.accountIdEnvVar,
    tokenEnv: account.tokenEnvVar,
  }));
}

function parseBodyJson(value: string | null): unknown {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as unknown;
  } catch (error) {
    throw new CloudflareControlError(error instanceof Error ? error.message : "Invalid --body-json.");
  }
}

export async function runCloudflareControl(args: readonly string[], env: EnvMap): Promise<string> {
  const parsed = parseArgs(args);
  if (!parsed.command || parsed.command === "help" || hasFlag(parsed.flags, "help")) return helpText();

  if (parsed.command === "accounts:list") {
    return formatOutput(objectRows(listCloudflareAccounts(), env), parsed.flags);
  }

  const account = resolveCloudflareAccount(flagString(parsed.flags, "account"));
  if (parsed.command === "token:verify") {
    return formatOutput(await verifyAccountToken(account, env), parsed.flags);
  }
  if (parsed.command === "r2:analytics:verify") {
    return formatOutput(await verifyR2Analytics(account, env), parsed.flags);
  }
  if (parsed.command === "r2:buckets:list") {
    const payload = await cloudflareRequest(account, env, "GET", "/accounts/{account_id}/r2/buckets");
    return formatOutput(redactAuthorization(payload.result ?? payload), parsed.flags);
  }
  if (parsed.command === "r2:objects:list") {
    const bucket = flagString(parsed.flags, "bucket") ?? account.bucketName;
    if (!bucket) throw new CloudflareControlError("Missing --bucket.");
    const query = new URLSearchParams();
    const prefix = flagString(parsed.flags, "prefix");
    const limit = flagString(parsed.flags, "limit");
    if (prefix) query.set("prefix", prefix);
    if (limit) query.set("per_page", limit);
    const path = `/accounts/{account_id}/r2/buckets/${encodeURIComponent(bucket)}/objects`;
    const payload = await cloudflareRequest(account, env, "GET", path, { query });
    return formatOutput(redactAuthorization(payload.result ?? payload), parsed.flags);
  }
  if (parsed.command === "r2:object:delete") {
    const bucket = flagString(parsed.flags, "bucket") ?? account.bucketName;
    const key = flagString(parsed.flags, "key");
    if (!bucket) throw new CloudflareControlError("Missing --bucket.");
    if (!key) throw new CloudflareControlError("Missing --key.");
    const path = `/accounts/{account_id}/r2/buckets/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(key)}`;
    const payload = await cloudflareRequest(account, env, "DELETE", path, { confirmed: hasFlag(parsed.flags, "confirm") });
    return formatOutput(redactAuthorization(payload.result ?? payload), parsed.flags);
  }
  if (parsed.command === "api:request") {
    const method = flagString(parsed.flags, "method") ?? "GET";
    const path = flagString(parsed.flags, "path");
    if (!path?.startsWith("/")) throw new CloudflareControlError("Missing absolute --path.");
    const payload = await cloudflareRequest(account, env, method, path, {
      body: parseBodyJson(flagString(parsed.flags, "body-json")),
      confirmed: hasFlag(parsed.flags, "confirm"),
    });
    return formatOutput(redactAuthorization(payload), parsed.flags);
  }

  throw new CloudflareControlError(`Unknown command "${parsed.command}".\n\n${helpText()}`);
}

async function main(): Promise<void> {
  const output = await runCloudflareControl(process.argv.slice(2), readEnvFiles());
  process.stdout.write(output);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
