/**
 * Ports — the application capabilities `@asol/ota-core` needs but must not import.
 *
 * Rule 7 runs both ways: other modules know nothing of this package's internals, and this
 * package must not know the application's. It reached into `@/features/*` in six places —
 * system-log telemetry and a super-admin predicate — which is feature *internals*, not a
 * designated boundary.
 *
 * Package doors that remain (not application edges):
 *
 * - `@asol/data-core/browser` and `@asol/data-core/ota` —
 *   the central data-access module is where database code is required to live; the
 *   drizzle contract (`ALLOWED_DRIZZLE_ORM_FILES_PATTERN`) forbids moving it here, and
 *   `orders-composition` depends on the same layer.
 *
 * Former `@/core/api`, `@/core/config/public-env`, `@/core/config/app-version`, and
 * `@/features/categories` edges are now ports on this same module.
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


export interface OtaHttpRequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  cache?: RequestCache;
  suppressErrorLog?: boolean;
}

/** Narrow HTTP surface the OTA runtime needs from the app's API client. */
export interface OtaHttpApiPort {
  getPublicJson<T>(assetPath: string, options?: OtaHttpRequestOptions): Promise<T>;
  getPublicBinary(assetPath: string, options?: OtaHttpRequestOptions): Promise<ArrayBuffer>;
  getAbsoluteJson<T>(url: string, options?: OtaHttpRequestOptions): Promise<T>;
  getAbsoluteBinary(url: string, options?: OtaHttpRequestOptions): Promise<ArrayBuffer>;
  get<T>(route: string, options?: OtaHttpRequestOptions): Promise<T>;
  post<T>(route: string, body: unknown, options?: OtaHttpRequestOptions): Promise<T>;
  put<T>(route: string, body: unknown, options?: OtaHttpRequestOptions): Promise<T>;
}

export interface OtaApiRoutesPort {
  ota: {
    access: string;
    adminReleases: string;
    adminReleaseDiff: string;
  };
}

export interface OtaPublicEnvPort {
  otaPublicKey: string;
  otaManifestUrl: string;
  webBundleVersion: string;
}

export interface OtaAppVersionsPort {
  currentAndroidNativeVersion: string;
  currentIosNativeVersion: string;
  currentWebContentVersion: string;
}

export interface OtaCategoryCatalogPort {
  getMainCategories(): readonly { id: number }[];
  getCollections(): readonly { id: number; items: readonly { id: number }[] }[];
  getCategoryTree(categoryId: number): {
    subcategories: readonly { originalId?: number }[];
    doctorAppointmentItems?: readonly { originalId?: number }[];
  } | null;
}

export interface OtaCorePorts {
  telemetry: OtaTelemetryPort;
  identity: OtaIdentityPort;
  httpApi: OtaHttpApiPort;
  apiRoutes: OtaApiRoutesPort;
  publicEnv: OtaPublicEnvPort;
  appVersions: OtaAppVersionsPort;
  categories: OtaCategoryCatalogPort;
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


const unsetHttpApi: OtaHttpApiPort = {
  getPublicJson: async () => {
    throw new Error('otaCorePort: httpApi is not configured');
  },
  getPublicBinary: async () => {
    throw new Error('otaCorePort: httpApi is not configured');
  },
  getAbsoluteJson: async () => {
    throw new Error('otaCorePort: httpApi is not configured');
  },
  getAbsoluteBinary: async () => {
    throw new Error('otaCorePort: httpApi is not configured');
  },
  get: async () => {
    throw new Error('otaCorePort: httpApi is not configured');
  },
  post: async () => {
    throw new Error('otaCorePort: httpApi is not configured');
  },
  put: async () => {
    throw new Error('otaCorePort: httpApi is not configured');
  },
};

const unsetApiRoutes: OtaApiRoutesPort = {
  ota: { access: '', adminReleases: '', adminReleaseDiff: '' },
};

const unsetPublicEnv: OtaPublicEnvPort = {
  otaPublicKey: '',
  otaManifestUrl: '',
  webBundleVersion: '',
};

const unsetAppVersions: OtaAppVersionsPort = {
  currentAndroidNativeVersion: '',
  currentIosNativeVersion: '',
  currentWebContentVersion: '',
};

const unsetCategories: OtaCategoryCatalogPort = {
  getMainCategories: () => {
    throw new Error('otaCorePort: categories is not configured');
  },
  getCollections: () => {
    throw new Error('otaCorePort: categories is not configured');
  },
  getCategoryTree: () => {
    throw new Error('otaCorePort: categories is not configured');
  },
};

/**
 * The registration lives on `globalThis`, not in this module's scope.
 *
 * A bundler may give one source file more than one instance: Next builds
 * `instrumentation` and each route into separate chunks, and Turbopack emitted
 * two copies of `data-core`'s runtime-config port — the composition root
 * configured one while every route read the other, and production answered 500
 * on every server route. Static checks and `tsx` tests cannot see it, because
 * Node resolves one path to one instance.
 *
 * A `Symbol.for` key on the global object is the same value from whichever
 * instance asks, which is what "configure once at startup" has to mean here.
 */
const PORTS_KEY = Symbol.for('@asol/ota-core/ports');

interface OtaCorePortsCarrier {
  [PORTS_KEY]?: OtaCorePorts;
}

const portsDefaults = (): OtaCorePorts => ({
  telemetry: noopTelemetry,
  identity: closedIdentity,
  httpApi: unsetHttpApi,
  apiRoutes: unsetApiRoutes,
  publicEnv: unsetPublicEnv,
  appVersions: unsetAppVersions,
  categories: unsetCategories,
});

function portsState(): OtaCorePorts {
  const carrier = globalThis as OtaCorePortsCarrier;
  carrier[PORTS_KEY] ??= portsDefaults();
  return carrier[PORTS_KEY]!;
}

function setPortsState(next: OtaCorePorts): void {
  (globalThis as OtaCorePortsCarrier)[PORTS_KEY] = next;
}

/**
 * Registers the application's implementations. Call once, early.
 *
 * Partial registration is allowed so a server entry can supply `telemetry.list` without
 * also owning the browser half.
 */
export function configureOtaCore(next: Partial<OtaCorePorts>): void {
  setPortsState({
    telemetry: next.telemetry ?? portsState().telemetry,
    identity: next.identity ?? portsState().identity,
    httpApi: next.httpApi ?? portsState().httpApi,
    apiRoutes: next.apiRoutes ?? portsState().apiRoutes,
    publicEnv: next.publicEnv ?? portsState().publicEnv,
    appVersions: next.appVersions ?? portsState().appVersions,
    categories: next.categories ?? portsState().categories,
  });
}

export function otaTelemetry(): OtaTelemetryPort {
  return portsState().telemetry;
}

export function otaIdentity(): OtaIdentityPort {
  return portsState().identity;
}

/** Test helper: restores the safe defaults. */
export function resetOtaCorePorts(): void {
  setPortsState({
    telemetry: noopTelemetry,
    identity: closedIdentity,
    httpApi: unsetHttpApi,
    apiRoutes: unsetApiRoutes,
    publicEnv: unsetPublicEnv,
    appVersions: unsetAppVersions,
    categories: unsetCategories,
  });
}

export function otaHttpApi(): OtaHttpApiPort {
  return portsState().httpApi;
}

export function otaApiRoutes(): OtaApiRoutesPort {
  return portsState().apiRoutes;
}

export function otaPublicEnv(): OtaPublicEnvPort {
  return portsState().publicEnv;
}

export function otaAppVersions(): OtaAppVersionsPort {
  return portsState().appVersions;
}

export function otaCategories(): OtaCategoryCatalogPort {
  return portsState().categories;
}
