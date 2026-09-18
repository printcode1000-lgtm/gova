import { asolHttpFetch } from '../../ports/http-fetch';

export type R2BillingClass = 'A' | 'B' | 'free';

export interface CloudflareR2UsageAnalytics {
  readonly capturedAt: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly classAOperations: number;
  readonly classBOperations: number;
  readonly storageBytes: number | null;
  readonly objectCount: number | null;
  readonly uploadCount: number | null;
  readonly operationTypes: readonly string[];
}

export interface ReadCloudflareR2UsageAnalyticsInput {
  readonly accountId: string;
  readonly bucketName: string;
  readonly apiToken: string;
  readonly now?: Date;
}

type OperationGroup = {
  readonly sum?: { readonly requests?: number | null } | null;
  readonly dimensions?: { readonly actionType?: string | null } | null;
};

type StorageGroup = {
  readonly max?: {
    readonly objectCount?: number | null;
    readonly uploadCount?: number | null;
    readonly payloadSize?: number | null;
    readonly metadataSize?: number | null;
  } | null;
  readonly dimensions?: { readonly datetime?: string | null } | null;
};

type GraphqlResponse = {
  readonly data?: {
    readonly viewer?: {
      readonly accounts?: readonly {
        readonly r2OperationsAdaptiveGroups?: readonly OperationGroup[] | null;
        readonly r2StorageAdaptiveGroups?: readonly StorageGroup[] | null;
      }[] | null;
    } | null;
  } | null;
  readonly errors?: readonly { readonly message?: string }[];
};

const GRAPHQL_URL = 'https://api.cloudflare.com/client/v4/graphql';

const GRAPHQL_QUERY = [
  'query R2UsageLive($accountTag: string!, $startDate: Time, $endDate: Time, $bucketName: string) {',
  '  viewer {',
  '    accounts(filter: { accountTag: $accountTag }) {',
  '      r2OperationsAdaptiveGroups(',
  '        limit: 10000',
  '        filter: {',
  '          datetime_geq: $startDate',
  '          datetime_leq: $endDate',
  '          bucketName: $bucketName',
  '        }',
  '      ) {',
  '        sum { requests }',
  '        dimensions { actionType }',
  '      }',
  '      r2StorageAdaptiveGroups(',
  '        limit: 10000',
  '        filter: {',
  '          datetime_geq: $startDate',
  '          datetime_leq: $endDate',
  '          bucketName: $bucketName',
  '        }',
  '        orderBy: [datetime_DESC]',
  '      ) {',
  '        max { objectCount uploadCount payloadSize metadataSize }',
  '        dimensions { datetime }',
  '      }',
  '    }',
  '  }',
  '}',
].join('\n');

function monthStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

export function classifyR2BillingOperation(actionType: string): R2BillingClass {
  const normalized = actionType.toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (
    normalized === 'abortmultipartupload' ||
    normalized === 'deleteobject' ||
    normalized === 'deleteobjects'
  ) return 'free';
  if (normalized.startsWith('get') || normalized.startsWith('head')) return 'B';
  return 'A';
}

function latestStorage(groups: readonly StorageGroup[]): StorageGroup | undefined {
  return [...groups].sort((left, right) => {
    const leftTime = left.dimensions?.datetime ? Date.parse(left.dimensions.datetime) : 0;
    const rightTime = right.dimensions?.datetime ? Date.parse(right.dimensions.datetime) : 0;
    return rightTime - leftTime;
  })[0];
}

function assertGraphqlSuccess(payload: GraphqlResponse): void {
  if (!payload.errors?.length) return;
  const message = payload.errors.map((error) => error.message).filter(Boolean).join('; ');
  throw new Error(message || 'cloudflareR2AnalyticsFailed');
}

export async function readCloudflareR2UsageAnalytics(
  input: ReadCloudflareR2UsageAnalyticsInput,
): Promise<CloudflareR2UsageAnalytics> {
  const endDate = input.now ?? new Date();
  const startDate = monthStart(endDate);
  const response = await asolHttpFetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + input.apiToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: GRAPHQL_QUERY,
      variables: {
        accountTag: input.accountId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        bucketName: input.bucketName,
      },
    }),
    cache: 'no-store',
  });

  const payload = (await response.json()) as GraphqlResponse;
  if (!response.ok) throw new Error('cloudflareR2AnalyticsHttp' + response.status);
  assertGraphqlSuccess(payload);

  const account = payload.data?.viewer?.accounts?.[0];
  const operationGroups = account?.r2OperationsAdaptiveGroups ?? [];
  const storageGroups = account?.r2StorageAdaptiveGroups ?? [];
  let classAOperations = 0;
  let classBOperations = 0;
  const operationTypes: string[] = [];

  for (const group of operationGroups) {
    const actionType = group.dimensions?.actionType?.trim() || 'unknown';
    const requests = group.sum?.requests ?? 0;
    operationTypes.push(actionType + ':' + requests);
    const billingClass = classifyR2BillingOperation(actionType);
    if (billingClass === 'A') classAOperations += requests;
    if (billingClass === 'B') classBOperations += requests;
  }

  const storage = latestStorage(storageGroups)?.max ?? null;
  const payloadSize = storage?.payloadSize ?? null;
  const metadataSize = storage?.metadataSize ?? null;

  return {
    capturedAt: endDate.toISOString(),
    periodStart: startDate.toISOString(),
    periodEnd: endDate.toISOString(),
    classAOperations,
    classBOperations,
    storageBytes:
      payloadSize === null && metadataSize === null
        ? null
        : (payloadSize ?? 0) + (metadataSize ?? 0),
    objectCount: storage?.objectCount ?? null,
    uploadCount: storage?.uploadCount ?? null,
    operationTypes,
  };
}
