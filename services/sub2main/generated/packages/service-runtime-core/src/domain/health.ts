/**
 * Liveness for a service deployment.
 *
 * One rule holds across all six: report whether a credential is **present**, never its value, so
 * the endpoint can stay public while still making a partially configured deployment visible
 * without issuing a real query or sending a real push. Six copies of that rule is six chances to
 * write `value` where `Boolean(value)` was meant.
 *
 * Two shapes, because the deployments genuinely differ: a sharded database reports how many of
 * its shards are configured and which are missing; the others report a named flag per credential.
 */
export interface HealthReport {
  service: string;
  ok: boolean;
  configured: Record<string, unknown>;
}

export interface CredentialHealthOptions {
  /** The deployment's own name, e.g. `asol-products`. */
  service: string;
  /** Credential name → whether it is present. Values are coerced, never echoed. */
  credentials: Record<string, unknown>;
  /**
   * Whether a missing credential makes the deployment unhealthy. Off by default: these endpoints
   * answer "the process is up", and every deployment here has optional credentials whose absence
   * degrades one feature rather than the service.
   */
  requireAll?: boolean;
}

export function credentialHealthReport(options: CredentialHealthOptions): HealthReport {
  const configured: Record<string, boolean> = {};
  for (const [name, value] of Object.entries(options.credentials)) {
    configured[name] = Boolean(value);
  }
  return {
    service: options.service,
    ok: options.requireAll ? Object.values(configured).every(Boolean) : true,
    configured,
  };
}

export interface ShardHealthOptions {
  service: string;
  /** Environment prefixes; each expects `<PREFIX>_DATABASE_URL`. */
  shardPrefixes: readonly string[];
  /** Defaults to `process.env`; injectable so the contract test needs no global mutation. */
  env?: Record<string, string | undefined>;
}

export interface ShardHealthReport extends HealthReport {
  configured: { shards: number; missing: string[] };
}

export function shardHealthReport(options: ShardHealthOptions): ShardHealthReport {
  const env = options.env ?? process.env;
  const missing = options.shardPrefixes.filter((prefix) => !env[`${prefix}_DATABASE_URL`]);
  return {
    service: options.service,
    ok: missing.length === 0,
    configured: { shards: options.shardPrefixes.length - missing.length, missing },
  };
}

/** The route body itself. Always HTTP 200: liveness answers, it does not gate. */
export function shardHealthResponse(options: ShardHealthOptions): Response {
  return Response.json(shardHealthReport(options));
}

export function credentialHealthResponse(options: CredentialHealthOptions): Response {
  return Response.json(credentialHealthReport(options));
}
