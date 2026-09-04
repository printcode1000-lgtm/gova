const SHA_PATTERN = /^[0-9a-f]{40}$/;

export const RELEASE_READINESS_TIMEOUT_MS = 40 * 60 * 1000;
export const RELEASE_READINESS_POLL_MS = 10_000;

export type ReleaseReadinessStatus = "pending" | "ready" | "failed";

export interface WaitForReleaseReadinessOptions {
  revision: string;
  controlOrigin: string;
  timeoutMs?: number;
  pollMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
  now?: () => number;
}

function normalizeOrigin(origin: string): string {
  const trimmed = origin.trim().replace(/\/$/, "");
  if (!trimmed) throw new Error("releaseReadinessControlOriginMissing");
  const parsed = new URL(trimmed);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("releaseReadinessControlOriginInvalid");
  }
  return parsed.origin;
}

export function releaseReadinessUrl(controlOrigin: string, revision: string): string {
  if (!SHA_PATTERN.test(revision)) throw new Error("releaseReadinessInvalidRevision");
  return `${normalizeOrigin(controlOrigin)}/api/release-readiness/${revision}`;
}

export function parseReleaseReadinessResponse(
  expectedRevision: string,
  value: unknown,
): ReleaseReadinessStatus {
  if (!value || typeof value !== "object") throw new Error("releaseReadinessInvalidResponse");
  const candidate = value as { revision?: unknown; status?: unknown };
  if (candidate.revision !== expectedRevision) throw new Error("releaseReadinessRevisionMismatch");
  if (candidate.status !== "pending" && candidate.status !== "ready" && candidate.status !== "failed") {
    throw new Error("releaseReadinessInvalidStatus");
  }
  return candidate.status;
}

async function defaultSleep(milliseconds: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

export async function waitForReleaseReadiness(
  options: WaitForReleaseReadinessOptions,
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? RELEASE_READINESS_TIMEOUT_MS;
  const pollMs = options.pollMs ?? RELEASE_READINESS_POLL_MS;
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? Date.now;
  const url = releaseReadinessUrl(options.controlOrigin, options.revision);
  const deadline = now() + timeoutMs;
  let lastTransient = "pending";

  while (now() < deadline) {
    try {
      const response = await fetchImpl(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!response.ok) {
        if ([404, 408, 429, 500, 502, 503, 504].includes(response.status)) {
          lastTransient = `http_${response.status}`;
        } else {
          throw new Error(`releaseReadinessHttp${response.status}`);
        }
      } else {
        const status = parseReleaseReadinessResponse(options.revision, await response.json());
        lastTransient = status;
        if (status === "ready") return;
        if (status === "failed") throw new Error("releaseReadinessFailed");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        message === "releaseReadinessFailed" ||
        message === "releaseReadinessInvalidRevision" ||
        message === "releaseReadinessControlOriginMissing" ||
        message === "releaseReadinessControlOriginInvalid" ||
        message === "releaseReadinessRevisionMismatch" ||
        message === "releaseReadinessInvalidStatus" ||
        message === "releaseReadinessInvalidResponse" ||
        /^releaseReadinessHttp4\d\d$/.test(message)
      ) {
        throw error;
      }
      lastTransient = "network_error";
    }

    if (now() >= deadline) break;
    await sleep(Math.min(pollMs, Math.max(1, deadline - now())));
  }

  throw new Error(`releaseReadinessTimeout:${lastTransient}`);
}

export async function assertHostedGovaReleaseReady(
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  // This is deliberately a release-command build input, not Vercel's Git
  // metadata.  Git metadata is suppressed for every upload, including gova,
  // so a push to main can never turn into a production deployment.
  const revision = env.ASOL_RELEASE_REVISION?.trim() ?? "";
  const controlOrigin = env.NEXT_PUBLIC_ASOL_CONTROL_URL?.trim() ?? "";
  if (!SHA_PATTERN.test(revision)) throw new Error("releaseReadinessHostedRevisionMissing");
  if (!controlOrigin) throw new Error("releaseReadinessControlOriginMissing");

  console.log(`[vercel-build] waiting for exact-SHA release readiness: ${revision}`);
  await waitForReleaseReadiness({ revision, controlOrigin });
  console.log(`[vercel-build] exact-SHA release readiness is ready: ${revision}`);
}
