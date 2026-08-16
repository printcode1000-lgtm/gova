/**
 * Ports — the application capabilities `@asol/ota-core` needs but must not import.
 *
 * Rule 7 runs both ways: other modules know nothing of this package's internals, and this
 * package must not know the application's. It reached into `@/features/*` in six places —
 * system-log telemetry and a super-admin predicate — which is feature *internals*, not a
 * designated boundary.
 *
 * Four other edges are deliberately **not** ports, because they are the repository's own
 * designed doors rather than violations:
 *
 * - `@/modules/data-access/browser/asol-db` and `@/modules/data-access/domains/ota` —
 *   the central data-access module is where database code is required to live; the
 *   drizzle contract (`ALLOWED_DRIZZLE_ORM_FILES_PATTERN`) forbids moving it here, and
 *   `orders-composition` depends on the same layer.
 * - `@/core/api` — the designated HTTP transport, itself governed by `ALLOWED_FETCH_FILES`.
 * - `@/core/config/public-env` — a config leaf.
 *
 * Inverting those would trade one edge for another and break a different rule. Naming the
 * distinction matters more than driving a count to zero.
 *
 * ## Failure behaviour
 *
 * Every port defaults to a safe implementation, so an application that forgets to call
 * `configureOtaCore` degrades rather than crashes:
 *
 * - telemetry defaults to a no-op — losing a log line must never break an update check;
 * - the identity predicate defaults to **false**, failing closed. An unconfigured build
 *   grants nobody super-admin rather than granting everybody.
 *
 * That default is the whole reason this is safe to do to a shipped OTA runtime: the
 * failure mode of a missing registration is "no telemetry" or "no admin", never "no
 * updates".
 */

/** A single system-log entry, shaped by the application's log entity. */
export interface OtaLogEntry {
  [key: string]: unknown;
}

import type { OtaLogEntryInput } from "../domain/release/adoption";

export interface OtaTelemetryPort {
  /** Sends a batch of queued outcome logs. Failure is swallowed by the caller. */
  ingestBatch(entries: OtaLogEntry[]): Promise<unknown>;
  /** Reports a pre-authentication failure by label. */
  reportFailure(
    label: string,
    error: unknown,
    context?: Record<string, unknown>,
    level?: string,
  ): void;
  /**
   * Reads recent logs for the release console. Server-side only.
   *
   * Typed as this package's own `OtaLogEntryInput` rather than `unknown[]`: a port is a
   * contract the package states, so it names the shape it needs and the application
   * satisfies it. Returning `unknown[]` would just move the cast inward.
   */
  list(input: { limit: number }): Promise<readonly OtaLogEntryInput[]>;
}

export interface OtaIdentityPort {
  /** Whether the given identity is the super admin. Defaults to false: fail closed. */
  isSuperAdmin(uid: string, phone: string): boolean;
}

export interface OtaCorePorts {
  telemetry: OtaTelemetryPort;
  identity: OtaIdentityPort;
}

const noopTelemetry: OtaTelemetryPort = {
  async ingestBatch() {
    return undefined;
  },
  reportFailure() {
    /* no telemetry configured */
  },
  async list(): Promise<readonly OtaLogEntryInput[]> {
    return [];
  },
};

const closedIdentity: OtaIdentityPort = {
  isSuperAdmin() {
    return false;
  },
};

let ports: OtaCorePorts = {
  telemetry: noopTelemetry,
  identity: closedIdentity,
};

/**
 * Registers the application's implementations. Call once, early.
 *
 * Partial registration is allowed so a server entry can supply `telemetry.list` without
 * also owning the browser half.
 */
export function configureOtaCore(next: Partial<OtaCorePorts>): void {
  ports = {
    telemetry: next.telemetry ?? ports.telemetry,
    identity: next.identity ?? ports.identity,
  };
}

export function otaTelemetry(): OtaTelemetryPort {
  return ports.telemetry;
}

export function otaIdentity(): OtaIdentityPort {
  return ports.identity;
}

/** Test helper: restores the safe defaults. */
export function resetOtaCorePorts(): void {
  ports = {
    telemetry: noopTelemetry,
    identity: closedIdentity,
    };
}
