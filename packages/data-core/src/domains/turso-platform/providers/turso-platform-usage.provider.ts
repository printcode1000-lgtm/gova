import { asolHttpFetch } from '../../../ports/runtime-config';

const PLATFORM_API_BASE = 'https://api.turso.tech/v1';

type ProviderUsage = {
  readonly rows_read?: number;
  readonly rows_written?: number;
  readonly storage_bytes?: number;
  readonly bytes_synced?: number;
  readonly input_bytes_count?: number;
  readonly output_bytes_count?: number;
  readonly databases?: number;
  readonly locations?: number;
  readonly groups?: number;
};

type ProviderUsageResponse = {
  readonly organization?: { readonly usage?: ProviderUsage };
};

type ProviderSubscriptionResponse = {
  readonly subscription?: {
    readonly plan?: string;
    readonly name?: string;
    readonly overages?: boolean;
    readonly current_billing_period_start?: string;
    readonly current_billing_period_end?: string;
  };
};
type ProviderPlanQuotas = {
  readonly rowsRead?: number;
  readonly rowsWritten?: number;
  readonly storage?: number;
  readonly bytesSynced?: number;
  readonly databases?: number;
  readonly locations?: number;
  readonly groups?: number;
};

type ProviderPlansResponse = {
  readonly plans?: readonly {
    readonly name?: string;
    readonly quotas?: ProviderPlanQuotas;
  }[];
};

export type TursoOrganizationUsageMetrics = {
  readonly rowsRead: number | null;
  readonly rowsWritten: number | null;
  readonly storageBytes: number | null;
  readonly bytesSynced: number | null;
  readonly inputBytes: number | null;
  readonly outputBytes: number | null;
  readonly databases: number | null;
  readonly locations: number | null;
  readonly groups: number | null;
};
export type TursoOrganizationPlan = {
  readonly name: string | null;
  readonly overages: boolean | null;
  readonly billingPeriodStart: string | null;
  readonly billingPeriodEnd: string | null;
  readonly quotas: {
    readonly rowsRead: number | null;
    readonly rowsWritten: number | null;
    readonly storageBytes: number | null;
    readonly bytesSynced: number | null;
    readonly databases: number | null;
    readonly locations: number | null;
    readonly groups: number | null;
  };
};

export type TursoOrganizationLiveUsage = {
  readonly usage: TursoOrganizationUsageMetrics;
  readonly plan: TursoOrganizationPlan;
};

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
async function platformGet<T>(
  organization: string,
  apiToken: string,
  path: string,
): Promise<T> {
  const response = await asolHttpFetch(
    `${PLATFORM_API_BASE}/organizations/${encodeURIComponent(organization)}/${path}`,
    {
      headers: { Authorization: `Bearer ${apiToken}` },
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    throw new Error(`Turso ${path} API returned HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function readTursoOrganizationLiveUsage(input: {
  readonly organization: string;
  readonly apiToken: string;
}): Promise<TursoOrganizationLiveUsage> {
  const usagePayload = await platformGet<ProviderUsageResponse>(
    input.organization,
    input.apiToken,
    'usage',
  );
  const usage = usagePayload.organization?.usage ?? {};
  const [subscriptionPayload, plansPayload] = await Promise.all([
    platformGet<ProviderSubscriptionResponse>(
      input.organization,
      input.apiToken,
      'subscription',
    ).catch(() => null),
    platformGet<ProviderPlansResponse>(
      input.organization,
      input.apiToken,
      'plans',
    ).catch(() => null),
  ]);

  const subscription = subscriptionPayload?.subscription;
  const planName = subscription?.plan ?? subscription?.name ?? null;
  const providerPlan = plansPayload?.plans?.find((candidate) => candidate.name === planName);
  const quotas = providerPlan?.quotas;

  return {
    usage: {
      rowsRead: numberOrNull(usage.rows_read),
      rowsWritten: numberOrNull(usage.rows_written),
      storageBytes: numberOrNull(usage.storage_bytes),
      bytesSynced: numberOrNull(usage.bytes_synced),
      inputBytes: numberOrNull(usage.input_bytes_count),
      outputBytes: numberOrNull(usage.output_bytes_count),
      databases: numberOrNull(usage.databases),
      locations: numberOrNull(usage.locations),
      groups: numberOrNull(usage.groups),
    },
    plan: {
      name: planName,
      overages: typeof subscription?.overages === 'boolean' ? subscription.overages : null,
      billingPeriodStart: subscription?.current_billing_period_start ?? null,
      billingPeriodEnd: subscription?.current_billing_period_end ?? null,
      quotas: {
        rowsRead: numberOrNull(quotas?.rowsRead),
        rowsWritten: numberOrNull(quotas?.rowsWritten),
        storageBytes: numberOrNull(quotas?.storage),
        bytesSynced: numberOrNull(quotas?.bytesSynced),
        databases: numberOrNull(quotas?.databases),
        locations: numberOrNull(quotas?.locations),
        groups: numberOrNull(quotas?.groups),
      },
    },
  };
}
