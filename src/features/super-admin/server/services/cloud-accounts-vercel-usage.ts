import {
  readVercelApiRateLimit,
  readProjectGitRepository,
  resolveTeamSummary,
  readVercelBillingCharges,
  verifyAccountTokenAccess,
  type AccountDeclaration,
  type VercelFocusCharge,
} from "@asol/vercel-deploy-core";

/**
 * One Vercel account's safe usage summary: API rate-limit headers and FOCUS
 * billing charges read through `@asol/vercel-deploy-core`, reduced to numbers
 * and labels. Shared by the live `/dev/cloud-accounts` read and the
 * `cloud-accounts:vercel-usage` snapshot script so both summarize identically.
 * Tokens are read from `values` and never returned.
 */

export type VercelUsageMetricSnapshot = {
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
    teamSlug: null,
    ownerEmail: null,
    planLabel: null,
    gitRepository: null,
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

function summarizeCharges(charges: readonly VercelFocusCharge[]) {
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

function summarizeDashboardMetrics(charges: readonly VercelFocusCharge[]): VercelUsageMetricSnapshot[] {
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

function billingUnavailableMessage(error: unknown, plan: string | null): string {
  const message = error instanceof Error ? error.message : "تعذر جلب Billing FOCUS.";
  if (message.includes("HTTP 404")) {
    return `خطة ${plan ?? "هذا الفريق"} لا تتيح Vercel Billing/Usage API لهذا النطاق.`;
  }
  return message;
}

export async function readVercelAccountUsage(
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
    const team = await resolveTeamSummary(token);
    const teamSlug = team?.slug ?? null;
    const gitRepository =
      (await readProjectGitRepository(token, declaration.project, access.teamId)) ?? null;
    const ownerEmail = access.account.includes("@") ? access.account : null;
    const rate = await readVercelApiRateLimit(token, access.teamId);
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
      const charges = await readVercelBillingCharges(
        token,
        access.teamId,
        monthStart(new Date(capturedAt)),
        new Date(capturedAt),
      );
      billing = {
        ...summarizeCharges(charges),
        metrics: summarizeDashboardMetrics(charges),
        billingMessage: null,
      };
    } catch (error) {
      billing.billingMessage = billingUnavailableMessage(error, team?.plan ?? null);
    }
    return {
      status: "ok",
      capturedAt,
      teamSlug,
      ownerEmail,
      planLabel: team?.plan ?? null,
      gitRepository,
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
