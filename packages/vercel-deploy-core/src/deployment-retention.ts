export interface VercelDeploymentCleanupOptions {
  token: string;
  project: string;
  teamId?: string;
  protectedDeploymentIds: readonly string[];
  maxDeletes?: number;
}

export interface VercelDeploymentCleanupResult {
  scanned: number;
  eligible: number;
  deleted: number;
  protected: number;
  skippedActive: number;
  failed: number;
  rateLimited: boolean;
  rateLimitResetAt?: string;
}

type DeploymentRecord = {
  uid?: string;
  id?: string;
  state?: string;
  readyState?: string;
  created?: number;
};

type DeploymentPage = {
  deployments?: DeploymentRecord[];
  pagination?: { next?: number | null };
};
const ACTIVE_STATES = new Set(["QUEUED", "INITIALIZING", "BUILDING"]);
const DEFAULT_MAX_DELETES = 180;

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function scopedUrl(url: URL, teamId?: string): URL {
  if (teamId) url.searchParams.set("teamId", teamId);
  return url;
}

function deploymentId(record: DeploymentRecord): string | undefined {
  return record.uid ?? record.id;
}

function deploymentState(record: DeploymentRecord): string {
  return String(record.readyState ?? record.state ?? "").toUpperCase();
}

async function listProjectDeployments(
  options: VercelDeploymentCleanupOptions,
  fetchImpl: typeof fetch,
): Promise<DeploymentRecord[]> {
  const records: DeploymentRecord[] = [];
  const cursors = new Set<number>();
  let until: number | undefined;
  for (;;) {
    const url = scopedUrl(
      new URL("https://api.vercel.com/v7/deployments"),
      options.teamId,
    );
    url.searchParams.set("app", options.project);
    url.searchParams.set("limit", "100");
    if (until !== undefined) url.searchParams.set("until", String(until));

    const response = await fetchImpl(url, {
      headers: headers(options.token),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(
        `Failed to list Vercel deployments for ${options.project}: ${response.status} ${await response.text()}`,
      );
    }
    const page = (await response.json()) as DeploymentPage;
    records.push(...(page.deployments ?? []));
    const next = page.pagination?.next ?? undefined;
    if (next === undefined || cursors.has(next)) break;
    cursors.add(next);
    until = next;
  }

  return records;
}

function parseRateLimitReset(body: string): string | undefined {
  try {
    const reset = (
      JSON.parse(body) as { error?: { limit?: { reset?: number } } }
    ).error?.limit?.reset;
    return typeof reset === "number"
      ? new Date(reset).toISOString()
      : undefined;
  } catch {
    return undefined;
  }
}
export async function cleanupVercelProjectDeployments(
  options: VercelDeploymentCleanupOptions,
  fetchImpl: typeof fetch = fetch,
): Promise<VercelDeploymentCleanupResult> {
  const protectedIds = new Set(options.protectedDeploymentIds.filter(Boolean));
  const records = await listProjectDeployments(options, fetchImpl);
  const candidates = records.filter((record) => {
    const id = deploymentId(record);
    return (
      id && !protectedIds.has(id) && !ACTIVE_STATES.has(deploymentState(record))
    );
  });
  const skippedActive = records.filter((record) =>
    ACTIVE_STATES.has(deploymentState(record)),
  ).length;
  const maxDeletes = Math.max(
    0,
    Math.min(options.maxDeletes ?? DEFAULT_MAX_DELETES, DEFAULT_MAX_DELETES),
  );

  let deleted = 0;
  let failed = 0;
  let rateLimited = false;
  let rateLimitResetAt: string | undefined;

  for (const record of candidates.slice(0, maxDeletes)) {
    const id = deploymentId(record)!;
    const url = scopedUrl(
      new URL(
        `https://api.vercel.com/v13/deployments/${encodeURIComponent(id)}`,
      ),
      options.teamId,
    );
    const response = await fetchImpl(url, {
      method: "DELETE",
      headers: headers(options.token),
    });
    if (response.ok || response.status === 404 || response.status === 410) {
      deleted += 1;
      continue;
    }
    const body = await response.text();
    if (response.status === 429) {
      rateLimited = true;
      rateLimitResetAt = parseRateLimitReset(body);
      break;
    }
    failed += 1;
  }

  return {
    scanned: records.length,
    eligible: candidates.length,
    deleted,
    protected: records.filter((record) => {
      const id = deploymentId(record);
      return Boolean(id && protectedIds.has(id));
    }).length,
    skippedActive,
    failed,
    rateLimited,
    ...(rateLimitResetAt ? { rateLimitResetAt } : {}),
  };
}
