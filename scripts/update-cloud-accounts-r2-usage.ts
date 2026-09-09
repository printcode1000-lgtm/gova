import { writeFileSync } from "node:fs";
import path from "node:path";

import { readEnvFiles } from "@asol/env-core/files";
import { getAllStorageAccounts, type StorageAccountDefinition } from "@asol/storage-core";

import { OTA_R2_CLOUD_ACCOUNT } from "../src/features/super-admin/presentation/cloud-accounts-reference";
import { classifyR2Operation } from "./cloud-accounts-r2-usage-classification";
import { postCloudflareGraphqlViaBrowser } from "./cloudflare-browser-graphql";
import { R2_USAGE_SNAPSHOT } from "../src/features/super-admin/presentation/cloud-accounts-r2-usage-snapshot";

type R2UsageSnapshotRow = {
  readonly status: "ok" | "missingCredentials" | "apiError";
  readonly capturedAt: string | null;
  readonly periodStart: string | null;
  readonly periodEnd: string | null;
  readonly classAOperations: number | null;
  readonly classAOperationsLimit: number;
  readonly classBOperations: number | null;
  readonly classBOperationsLimit: number;
  readonly storageBytes: number | null;
  readonly storageBytesLimit: number;
  readonly objectCount: number | null;
  readonly uploadCount: number | null;
  readonly operationTypes: readonly string[];
  readonly message: string | null;
};

type R2UsageAccount = {
  readonly id: string;
  readonly accountId: string | null;
  readonly accountIdEnvVar: string;
  readonly bucketName: string;
  readonly apiTokenEnvVar: string;
  readonly browserDebugPort: number | null;
};

type GraphqlOperationGroup = {
  readonly sum?: {
    readonly requests?: number | null;
  } | null;
  readonly dimensions?: {
    readonly actionType?: string | null;
  } | null;
};

type GraphqlStorageGroup = {
  readonly max?: {
    readonly objectCount?: number | null;
    readonly uploadCount?: number | null;
    readonly payloadSize?: number | null;
    readonly metadataSize?: number | null;
  } | null;
  readonly dimensions?: {
    readonly datetime?: string | null;
  } | null;
};

type GraphqlR2Response = {
  readonly data?: {
    readonly viewer?: {
      readonly accounts?: readonly {
        readonly r2OperationsAdaptiveGroups?: readonly GraphqlOperationGroup[] | null;
        readonly r2StorageAdaptiveGroups?: readonly GraphqlStorageGroup[] | null;
      }[] | null;
    } | null;
  } | null;
  readonly errors?: readonly {
    readonly message?: string;
  }[];
};

const FREE_LIMITS = {
  classAOperations: 1_000_000,
  classBOperations: 10_000_000,
  storageBytes: 10_000_000_000,
} as const;

const BROWSER_DEBUG_PORTS: Readonly<Record<string, number>> = {
  general: 9321,
  products: 9322,
  "products-apparel-pets": 9323,
  ota: 9324,
};

const GRAPHQL_QUERY = `
query R2UsageSnapshot($accountTag: string!, $startDate: Time, $endDate: Time, $bucketName: string) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      r2OperationsAdaptiveGroups(
        limit: 10000
        filter: {
          datetime_geq: $startDate
          datetime_leq: $endDate
          bucketName: $bucketName
        }
      ) {
        sum {
          requests
        }
        dimensions {
          actionType
        }
      }
      r2StorageAdaptiveGroups(
        limit: 10000
        filter: {
          datetime_geq: $startDate
          datetime_leq: $endDate
          bucketName: $bucketName
        }
        orderBy: [datetime_DESC]
      ) {
        max {
          objectCount
          uploadCount
          payloadSize
          metadataSize
        }
        dimensions {
          datetime
        }
      }
    }
  }
}`;

function monthStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

function unavailable(
  status: "missingCredentials" | "apiError",
  message: string,
  capturedAt: string | null,
): R2UsageSnapshotRow {
  return {
    status,
    capturedAt,
    periodStart: capturedAt ? monthStart(new Date(capturedAt)).toISOString() : null,
    periodEnd: capturedAt,
    classAOperations: null,
    classAOperationsLimit: FREE_LIMITS.classAOperations,
    classBOperations: null,
    classBOperationsLimit: FREE_LIMITS.classBOperations,
    storageBytes: null,
    storageBytesLimit: FREE_LIMITS.storageBytes,
    objectCount: null,
    uploadCount: null,
    operationTypes: [],
    message,
  };
}

function tokenEnvVarFor(account: Pick<StorageAccountDefinition, "envPrefix">): string {
  return `${account.envPrefix}_API_TOKEN`;
}

function listAccounts(): R2UsageAccount[] {
  return [
    ...getAllStorageAccounts().map((account) => ({
      id: account.id,
      accountId: account.accountId,
      accountIdEnvVar: `${account.envPrefix}_ACCOUNT_ID`,
      bucketName: account.bucketName,
      apiTokenEnvVar: tokenEnvVarFor(account),
      browserDebugPort: BROWSER_DEBUG_PORTS[account.id] ?? null,
    })),
    {
      id: OTA_R2_CLOUD_ACCOUNT.id,
      accountId: null,
      accountIdEnvVar: `${OTA_R2_CLOUD_ACCOUNT.envPrefix}_ACCOUNT_ID`,
      bucketName: OTA_R2_CLOUD_ACCOUNT.bucketName,
      apiTokenEnvVar: `${OTA_R2_CLOUD_ACCOUNT.envPrefix}_API_TOKEN`,
      browserDebugPort: BROWSER_DEBUG_PORTS.ota,
    },
  ];
}

function latestStorage(groups: readonly GraphqlStorageGroup[]): GraphqlStorageGroup | undefined {
  return [...groups].sort((a, b) => {
    const aTime = a.dimensions?.datetime ? Date.parse(a.dimensions.datetime) : 0;
    const bTime = b.dimensions?.datetime ? Date.parse(b.dimensions.datetime) : 0;
    return bTime - aTime;
  })[0];
}

function graphqlVariables(account: R2UsageAccount, accountId: string, startDate: Date, endDate: Date) {
  return {
    accountTag: accountId,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    bucketName: account.bucketName,
  };
}

async function readGraphqlWithApiToken(
  account: R2UsageAccount,
  accountId: string,
  apiToken: string,
  startDate: Date,
  endDate: Date,
): Promise<GraphqlR2Response> {
  const response = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: GRAPHQL_QUERY,
      variables: graphqlVariables(account, accountId, startDate, endDate),
    }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Cloudflare GraphQL API returned HTTP ${response.status}`);
  return JSON.parse(text) as GraphqlR2Response;
}

async function readGraphqlWithBrowserSession(
  account: R2UsageAccount,
  accountId: string,
  startDate: Date,
  endDate: Date,
): Promise<GraphqlR2Response> {
  if (!account.browserDebugPort) throw new Error(`No browser fallback is configured for ${account.id}`);
  return postCloudflareGraphqlViaBrowser<GraphqlR2Response>(
    account.browserDebugPort,
    GRAPHQL_QUERY,
    graphqlVariables(account, accountId, startDate, endDate),
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function assertGraphqlSuccess(payload: GraphqlR2Response): void {
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).filter(Boolean).join("; "));
  }
}

function usageRowFromPayload(
  payload: GraphqlR2Response,
  startDate: Date,
  endDate: Date,
): R2UsageSnapshotRow {
  assertGraphqlSuccess(payload);
  const resultAccount = payload.data?.viewer?.accounts?.[0];
  const operationGroups = resultAccount?.r2OperationsAdaptiveGroups ?? [];
  const storageGroups = resultAccount?.r2StorageAdaptiveGroups ?? [];
  let classAOperations = 0;
  let classBOperations = 0;
  const operationTypes: string[] = [];
  for (const group of operationGroups) {
    const actionType = group.dimensions?.actionType?.trim() ?? "unknown";
    const requests = group.sum?.requests ?? 0;
    operationTypes.push(`${actionType}:${requests}`);
    const billingClass = classifyR2Operation(actionType);
    if (billingClass === "B") classBOperations += requests;
    if (billingClass === "A") classAOperations += requests;
  }
  const storage = latestStorage(storageGroups)?.max ?? null;
  const payloadSize = storage?.payloadSize ?? null;
  const metadataSize = storage?.metadataSize ?? null;
  return {
    status: "ok",
    capturedAt: endDate.toISOString(),
    periodStart: startDate.toISOString(),
    periodEnd: endDate.toISOString(),
    classAOperations,
    classAOperationsLimit: FREE_LIMITS.classAOperations,
    classBOperations,
    classBOperationsLimit: FREE_LIMITS.classBOperations,
    storageBytes: payloadSize === null && metadataSize === null ? null : (payloadSize ?? 0) + (metadataSize ?? 0),
    storageBytesLimit: FREE_LIMITS.storageBytes,
    objectCount: storage?.objectCount ?? null,
    uploadCount: storage?.uploadCount ?? null,
    operationTypes,
    message: null,
  };
}

async function readR2Usage(
  account: R2UsageAccount,
  accountId: string,
  apiToken: string | null,
  startDate: Date,
  endDate: Date,
): Promise<R2UsageSnapshotRow> {
  let apiError: unknown = apiToken ? null : new Error(`Missing ${account.apiTokenEnvVar}`);
  if (apiToken) {
    try {
      const payload = await readGraphqlWithApiToken(account, accountId, apiToken, startDate, endDate);
      assertGraphqlSuccess(payload);
      return usageRowFromPayload(payload, startDate, endDate);
    } catch (error) {
      apiError = error;
    }
  }

  try {
    const payload = await readGraphqlWithBrowserSession(account, accountId, startDate, endDate);
    return usageRowFromPayload(payload, startDate, endDate);
  } catch (browserError) {
    throw new Error(`${errorMessage(apiError)}; browser fallback failed: ${errorMessage(browserError)}`);
  }
}

function generatedHeader(): string {
  return "/**\n" +
    " * Safe Cloudflare R2 usage snapshot for `/dev/cloud-accounts`.\n" +
    " *\n" +
    " * Generated by `npm run cloud-accounts:r2-usage`. It contains numbers and\n" +
    " * labels only: never API tokens, S3 access keys, or secret values.\n" +
    " */\n\n";
}

function serializeSnapshot(rows: Record<string, R2UsageSnapshotRow>): string {
  return generatedHeader() +
    `export type CloudAccountsR2UsageSnapshotStatus =\n` +
    `  | "ok"\n` +
    `  | "missingCredentials"\n` +
    `  | "apiError";\n\n` +
    `export type CloudAccountsR2UsageSnapshotRow = {\n` +
    `  readonly status: CloudAccountsR2UsageSnapshotStatus;\n` +
    `  readonly capturedAt: string | null;\n` +
    `  readonly periodStart: string | null;\n` +
    `  readonly periodEnd: string | null;\n` +
    `  readonly classAOperations: number | null;\n` +
    `  readonly classAOperationsLimit: number;\n` +
    `  readonly classBOperations: number | null;\n` +
    `  readonly classBOperationsLimit: number;\n` +
    `  readonly storageBytes: number | null;\n` +
    `  readonly storageBytesLimit: number;\n` +
    `  readonly objectCount: number | null;\n` +
    `  readonly uploadCount: number | null;\n` +
    `  readonly operationTypes: readonly string[];\n` +
    `  readonly message: string | null;\n` +
    `};\n\n` +
    `export const R2_USAGE_SNAPSHOT = ${JSON.stringify(rows, null, 2)} as const satisfies Record<string, CloudAccountsR2UsageSnapshotRow>;\n`;
}

function preserveExistingOk(id: string, fallback: R2UsageSnapshotRow): R2UsageSnapshotRow {
  const existing = (R2_USAGE_SNAPSHOT as Record<string, R2UsageSnapshotRow>)[id];
  if (existing?.status === "ok" && fallback.status !== "ok") {
    return {
      ...existing,
      message: `${existing.message ?? "Previous successful snapshot preserved."} Latest refresh: ${fallback.message ?? fallback.status}.`,
    };
  }
  return fallback;
}

async function main(): Promise<void> {
  const values = readEnvFiles();
  const capturedAt = new Date();
  const rows: Record<string, R2UsageSnapshotRow> = {};

  for (const account of listAccounts()) {
    const accountId = values[account.accountIdEnvVar]?.trim() || account.accountId;
    const apiToken = values[account.apiTokenEnvVar]?.trim();
    if (!accountId) {
      rows[account.id] = preserveExistingOk(
        account.id,
        unavailable("missingCredentials", "معرّف حساب Cloudflare غير موجود محليًا.", null),
      );
      continue;
    }
    if (!apiToken) {
      rows[account.id] = preserveExistingOk(
        account.id,
        unavailable("missingCredentials", "مفتاح Cloudflare API غير موجود محليًا.", null),
      );
      continue;
    }
    try {
      rows[account.id] = await readR2Usage(account, accountId, apiToken, monthStart(capturedAt), capturedAt);
    } catch (error) {
      rows[account.id] = preserveExistingOk(
        account.id,
        unavailable(
          "apiError",
          error instanceof Error ? error.message : "تعذر جلب استخدام Cloudflare R2.",
          capturedAt.toISOString(),
        ),
      );
    }
  }

  const outputPath = path.join(
    process.cwd(),
    "src/features/super-admin/presentation/cloud-accounts-r2-usage-snapshot.ts",
  );
  writeFileSync(outputPath, serializeSnapshot(rows), "utf8");
  console.log(`Updated Cloudflare R2 usage snapshot for ${Object.keys(rows).length} account(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
