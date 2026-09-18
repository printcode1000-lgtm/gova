import { CLOUD_ACCOUNTS_COPY } from "./cloud-accounts-copy";
import type { VercelAccountFacts } from "./cloud-accounts-facts.types";

const { unavailable, noSnapshot, none, partSeparator, listSeparator } = CLOUD_ACCOUNTS_COPY;
const integerFormat = new Intl.NumberFormat("en-US");
const dateTimeFormat = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" });

export function abbreviateAccountId(id: string): string {
  if (id.includes("…") || id.length <= 14) return id;
  return `${id.slice(0, 8)}…${id.slice(-5)}`;
}

export function publicHost(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

export function formatInteger(value: number | null): string {
  return value === null ? unavailable : integerFormat.format(value);
}

export function formatBytes(value: number | null): string {
  if (value === null) return unavailable;
  if (value < 1_000_000) return `${integerFormat.format(value)} B`;
  if (value < 1_000_000_000) return `${(value / 1_000_000).toFixed(2)} MB`;
  return `${(value / 1_000_000_000).toFixed(2)} GB`;
}

export function formatUsd(value: number | null): string {
  if (value === null) return unavailable;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function formatDateTime(value: string | null): string {
  return value ? dateTimeFormat.format(new Date(value)) : noSnapshot;
}

export function orNone(value: string | null): string {
  return value ?? none;
}

export function orUnavailable(value: string | null): string {
  return value ?? unavailable;
}

export function usageLine(value: number | null, limit: number, formatter = formatInteger): string {
  if (value === null) return unavailable;
  const percent = (value / limit) * 100;
  return `${percent.toFixed(2)}%${partSeparator}${formatter(value)} / ${formatter(limit)}`;
}

export function usageLineOrLimit(value: number | null, limit: number, formatter = formatInteger): string {
  if (value === null) return `${unavailable} / ${formatter(limit)}`;
  return usageLine(value, limit, formatter);
}

export function joinList(values: readonly string[]): string {
  return values.join(listSeparator);
}

export function joinParts(values: readonly string[]): string {
  return values.join(partSeparator);
}

export function vercelAvailableUsageMetrics(account: VercelAccountFacts) {
  return account.usage.metrics.filter((metric) => metric.usedDisplay !== null);
}

/** The team's usage dashboard page for one metric, or `null` when Vercel has not named the team. */
export function vercelUsageUrl(account: VercelAccountFacts, slug: string): string | null {
  return account.usage.teamSlug ? `https://vercel.com/${account.usage.teamSlug}/~/usage/${slug}` : null;
}

/** API rate limit and billing readings Vercel actually returned for one account. */
export function vercelAvailableApiBillingParts(account: VercelAccountFacts): string[] {
  const { usage } = account;
  const copy = CLOUD_ACCOUNTS_COPY.vercel;
  const parts: string[] = [];
  if (usage.apiRateLimit !== null && usage.apiRateLimitRemaining !== null) {
    parts.push(copy.apiPart(`${usage.apiRateLimitRemaining} / ${usage.apiRateLimit}`));
  }
  if (usage.effectiveCostUsd !== null) parts.push(copy.billingPart(formatUsd(usage.effectiveCostUsd)));
  if (usage.billingLineCount !== null) {
    parts.push(copy.billingLinesPart(formatInteger(usage.billingLineCount)));
  }
  if (usage.topServices.length > 0) parts.push(joinList(usage.topServices));
  return parts;
}
