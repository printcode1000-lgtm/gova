import { writeFileSync } from "node:fs";
import path from "node:path";

import {
  ACCOUNT_DECLARATIONS,
  buildHeaders,
  verifyAccountTokenAccess,
  withTeam,
  type AccountDeclaration,
} from "@asol/vercel-deploy-core";
import { readEnvFiles } from "@asol/env-core/files";

type FocusCharge = {
  readonly BilledCost?: number | string | null;
  readonly EffectiveCost?: number | string | null;
  readonly ServiceName?: string | null;
  readonly ConsumedQuantity?: number | string | null;
  readonly ConsumedUnit?: string | null;
};

type VercelUsageMetricSnapshot = {
  readonly label: string;
  readonly slug: string;
  readonly usedDisplay: string | null;
  readonly limitDisplay: string;
  readonly source: "focusBilling" | "dashboardOnly";
};

const DEFAULT_METRICS = [
  ["Snapshot Storage", "snapshot-storage", "15 GB"],
  ["Fluid Active CPU", "vercel-functions-fluid-cpu-duration", "4h / 16h"],
  ["Sandbox Active CPU", "sandbox-active-cpu", "5h"],
  ["Sandbox Provisioned Memory", "sandbox-provisioned-memory", "420 GB-Hrs"],
  ["Fluid Provisioned Memory", "vercel-functions-fluid-duration", "360 / 1,440 GB-Hrs"],
  ["Function Invocations", "vercel-functions-invocations", "1M"],
  ["Edge Requests", "networking-edge-requests", "1M / 10M"],
  ["Image Optimization - Transformations", "image-optimization-image-transformations", "5K / 10K"],
  ["Fast Origin Transfer", "networking-fast-origin-transfer", "10 GB / 100 GB"],
  ["ISR Reads", "isr-reads", "1M"],
] as const;

const DEFAULT_LIMITS = {
  planLabel: "Hobby/default",
  edgeRequestsLimit: 1_000_000,
  fastDataTransferBytesLimit: 100_000_000_000,
  deploymentsPerDayLimit: 100,
  buildsPerHourLimit: 100,
  projectsLimit: 200,
  runtimeLogsHoursLimit: 1,
  functionDurationSecondsLimit: 300,
} as const;

function monthStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function unavailable(status: "missingCredentials" | "apiError", message: string, capturedAt: string | null) {
  return {
    status,
    capturedAt,
    billingPeriodStart: capturedAt ? monthStart(new Date(capturedAt)).toISOString() : null,
    billingPeriodEnd: capturedAt,
    ...DEFAULT_LIMITS,
    apiRateLimit: null,
    apiRateLimitRemaining: null,
    apiRateLimitReset: null,
    billedCostUsd: null,
    effectiveCostUsd: null,
    billingLineCount: null,
    topServices: [],
    metrics: DEFAULT_METRICS.map(([label, slug, limitDisplay]) => ({
      label,
      slug,
      usedDisplay: null,
      limitDisplay,
      source: "dashboardOnly",
    })),
    message,
  };
}

async function readApiRateLimit(token: string, teamId?: string) {
  const response = await fetch(withTeam("https://api.vercel.com/v10/projects?limit=1", teamId), {
    headers: buildHeaders(token),
  });
  const resetSeconds = numberOrNull(response.headers.get("x-ratelimit-reset"));
  return {
    limit: numberOrNull(response.headers.get("x-ratelimit-limit")),
    remaining: numberOrNull(response.headers.get("x-ratelimit-remaining")),
    reset: resetSeconds === null ? null : new Date(resetSeconds * 1000).toISOString(),
  };
}

async function readBillingCharges(token: string, teamId: string | undefined, from: Date, to: Date): Promise<FocusCharge[]> {
  const url = withTeam(
    `https://api.vercel.com/v1/billing/charges?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
    teamId,
  );
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Vercel billing API returned HTTP ${response.status}`);
  }
  const body = await response.text();
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as FocusCharge);
}

function summarizeCharges(charges: readonly FocusCharge[]) {
  const billedCostUsd = charges.reduce((sum, charge) => sum + (numberOrNull(charge.BilledCost) ?? 0), 0);
  const effectiveCostUsd = charges.reduce((sum, charge) => sum + (numberOrNull(charge.EffectiveCost) ?? 0), 0);
  const serviceCounts = new Map<string, number>();
  for (const charge of charges) {
    const serviceName = charge.ServiceName?.trim();
    if (!serviceName) continue;
    serviceCounts.set(serviceName, (serviceCounts.get(serviceName) ?? 0) + 1);
  }
  return {
    billedCostUsd,
    effectiveCostUsd,
    billingLineCount: charges.length,
    topServices: [...serviceCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 3)
      .map(([name]) => name),
  };
}

function normalizeMetricName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function compactQuantity(value: number, unit: string): string {
  if (unit.toLowerCase().includes("byte")) {
    if (value < 1_000_000) return `${Math.round(value)} B`;
    if (value < 1_000_000_000) return `${(value / 1_000_000).toFixed(2)} MB`;
    return `${(value / 1_000_000_000).toFixed(2)} GB`;
  }
  if (unit.toLowerCase().includes("hour")) return `${Number(value.toFixed(2))} ${unit}`;
  if (value >= 1_000_000) return `${Number((value / 1_000_000).toFixed(2))}M`;
  if (value >= 1_000) return `${Number((value / 1_000).toFixed(2))}K`;
  return `${Number(value.toFixed(2))} ${unit}`.trim();
}

function summarizeDashboardMetrics(charges: readonly FocusCharge[]): VercelUsageMetricSnapshot[] {
  const normalizedCharges = charges.map((charge) => ({
    name: normalizeMetricName(charge.ServiceName ?? ""),
    quantity: numberOrNull(charge.ConsumedQuantity),
    unit: charge.ConsumedUnit?.trim() ?? "",
  }));
  return DEFAULT_METRICS.map(([label, slug, limitDisplay]) => {
    const wanted = normalizeMetricName(label);
    const matched = normalizedCharges.filter((charge) => charge.name.includes(wanted));
    const unit = matched.find((charge) => charge.unit)?.unit ?? "";
    const total = matched.reduce((sum, charge) => sum + (charge.quantity ?? 0), 0);
    return {
      label,
      slug,
      usedDisplay: matched.length > 0 ? compactQuantity(total, unit) : null,
      limitDisplay,
      source: matched.length > 0 ? "focusBilling" : "dashboardOnly",
    };
  });
}

function generatedHeader(): string {
  return "/**\n" +
    " * Safe Vercel usage snapshot for `/dev/cloud-accounts`.\n" +
    " *\n" +
    " * Generated by `npm run cloud-accounts:vercel-usage`. It contains numbers and\n" +
    " * labels only: never access tokens or project secrets.\n" +
    " */\n\n";
}

function serializeSnapshot(rows: Record<string, unknown>): string {
  return generatedHeader() +
    `export type CloudAccountsVercelUsageSnapshotStatus =\n` +
    `  | "ok"\n` +
    `  | "missingCredentials"\n` +
    `  | "apiError";\n\n` +
    `export type CloudAccountsVercelUsageSnapshotRow = {\n` +
    `  readonly status: CloudAccountsVercelUsageSnapshotStatus;\n` +
    `  readonly capturedAt: string | null;\n` +
    `  readonly billingPeriodStart: string | null;\n` +
    `  readonly billingPeriodEnd: string | null;\n` +
    `  readonly planLabel: string;\n` +
    `  readonly edgeRequestsLimit: number;\n` +
    `  readonly fastDataTransferBytesLimit: number;\n` +
    `  readonly deploymentsPerDayLimit: number;\n` +
    `  readonly buildsPerHourLimit: number;\n` +
    `  readonly projectsLimit: number;\n` +
    `  readonly runtimeLogsHoursLimit: number;\n` +
    `  readonly functionDurationSecondsLimit: number;\n` +
    `  readonly apiRateLimit: number | null;\n` +
    `  readonly apiRateLimitRemaining: number | null;\n` +
    `  readonly apiRateLimitReset: string | null;\n` +
    `  readonly billedCostUsd: number | null;\n` +
    `  readonly effectiveCostUsd: number | null;\n` +
    `  readonly billingLineCount: number | null;\n` +
    `  readonly topServices: readonly string[];\n` +
    `  readonly metrics: readonly CloudAccountsVercelUsageMetricSnapshot[];\n` +
    `  readonly message: string | null;\n` +
    `};\n\n` +
    `export type CloudAccountsVercelUsageMetricSnapshot = {\n` +
    `  readonly label: string;\n` +
    `  readonly slug: string;\n` +
    `  readonly usedDisplay: string | null;\n` +
    `  readonly limitDisplay: string;\n` +
    `  readonly source: "focusBilling" | "dashboardOnly";\n` +
    `};\n\n` +
    `export const VERCEL_USAGE_SNAPSHOT = ${JSON.stringify(rows, null, 2)} as const satisfies Record<string, CloudAccountsVercelUsageSnapshotRow>;\n`;
}

async function snapshotAccount(
  declaration: AccountDeclaration,
  values: Record<string, string | undefined>,
  capturedAt: string,
) {
  const token = values[declaration.tokenEnvVar]?.trim();
  if (!token) {
    return unavailable("missingCredentials", "مفتاح Vercel غير موجود محليًا.", null);
  }

  try {
    const access = await verifyAccountTokenAccess(declaration, values);
    const rate = await readApiRateLimit(token, access.teamId);
    let billing: {
      billedCostUsd: number | null;
      effectiveCostUsd: number | null;
      billingLineCount: number | null;
      topServices: string[];
      metrics: VercelUsageMetricSnapshot[];
      billingMessage: string | null;
    } = {
      billedCostUsd: null as number | null,
      effectiveCostUsd: null as number | null,
      billingLineCount: null as number | null,
      topServices: [] as string[],
      metrics: DEFAULT_METRICS.map(([label, slug, limitDisplay]) => ({
        label,
        slug,
        usedDisplay: null,
        limitDisplay,
        source: "dashboardOnly" as const,
      })),
      billingMessage: null as string | null,
    };
    try {
      const charges = await readBillingCharges(token, access.teamId, monthStart(new Date(capturedAt)), new Date(capturedAt));
      billing = {
        ...summarizeCharges(charges),
        metrics: summarizeDashboardMetrics(charges),
        billingMessage: null,
      };
    } catch (error) {
      billing.billingMessage = error instanceof Error ? error.message : "تعذر جلب Billing FOCUS.";
    }
    return {
      status: "ok",
      capturedAt,
      billingPeriodStart: monthStart(new Date(capturedAt)).toISOString(),
      billingPeriodEnd: capturedAt,
      ...DEFAULT_LIMITS,
      apiRateLimit: rate.limit,
      apiRateLimitRemaining: rate.remaining,
      apiRateLimitReset: rate.reset,
      billedCostUsd: billing.billedCostUsd,
      effectiveCostUsd: billing.effectiveCostUsd,
      billingLineCount: billing.billingLineCount,
      topServices: billing.topServices,
      metrics: billing.metrics,
      message: billing.billingMessage,
    };
  } catch (error) {
    return unavailable(
      "apiError",
      error instanceof Error ? error.message : "تعذر جلب استخدام Vercel.",
      capturedAt,
    );
  }
}

async function main(): Promise<void> {
  const values = readEnvFiles();
  const capturedAt = new Date().toISOString();
  const snapshot: Record<string, unknown> = {};

  for (const declaration of Object.values(ACCOUNT_DECLARATIONS) as AccountDeclaration[]) {
    snapshot[declaration.name] = await snapshotAccount(declaration, values, capturedAt);
  }

  const outputPath = path.join(
    process.cwd(),
    "src/features/super-admin/presentation/cloud-accounts-vercel-usage-snapshot.ts",
  );
  writeFileSync(outputPath, serializeSnapshot(snapshot), "utf8");
  console.log(`Updated Vercel usage snapshot for ${Object.keys(snapshot).length} account(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
