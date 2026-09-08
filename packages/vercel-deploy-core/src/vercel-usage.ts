export interface VercelFocusCharge {
  readonly BilledCost?: number | string | null;
  readonly EffectiveCost?: number | string | null;
  readonly ServiceName?: string | null;
  readonly ConsumedQuantity?: number | string | null;
  readonly ConsumedUnit?: string | null;
}

export interface VercelApiRateLimitSnapshot {
  readonly limit: number | null;
  readonly remaining: number | null;
  readonly reset: string | null;
}

function withTeam(url: string, teamId?: string): string {
  if (!teamId) return url;
  return `${url}${url.includes('?') ? '&' : '?'}teamId=${encodeURIComponent(teamId)}`;
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function readVercelApiRateLimit(
  token: string,
  teamId?: string,
): Promise<VercelApiRateLimitSnapshot> {
  const response = await fetch(withTeam('https://api.vercel.com/v10/projects?limit=1', teamId), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const resetSeconds = numberOrNull(response.headers.get('x-ratelimit-reset'));
  return {
    limit: numberOrNull(response.headers.get('x-ratelimit-limit')),
    remaining: numberOrNull(response.headers.get('x-ratelimit-remaining')),
    reset: resetSeconds === null ? null : new Date(resetSeconds * 1000).toISOString(),
  };
}

export async function readVercelBillingCharges(
  token: string,
  teamId: string | undefined,
  from: Date,
  to: Date,
): Promise<VercelFocusCharge[]> {
  const url = withTeam(
    `https://api.vercel.com/v1/billing/charges?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
    teamId,
  );
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Vercel billing API returned HTTP ${response.status}`);
  }
  const body = await response.text();
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as VercelFocusCharge);
}
