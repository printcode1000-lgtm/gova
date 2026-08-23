/**
 * Runtime config port — rule 7 the other way.
 *
 * Database drivers, Turso provisioning, and specialty-column mapping need
 * environment flags, credentials, HTTP, and the category catalog. None of those
 * may be imported from `@/`; the application registers them here.
 *
 * Defaults preserve safe behaviour where possible (global `fetch`, `process.env`
 * for optional reads) and fail loudly for credentials / category catalog access
 * that would otherwise produce silently wrong data.
 */

export interface TursoCredentials {
  url: string;
  authToken: string;
}

export interface TursoPlatformCredentials {
  apiToken: string;
  organization: string;
}

export interface SpecialtyColumnItem {
  kind: string;
  categoryId: number;
  originalId: number;
  column: string;
  [key: string]: unknown;
}

export interface DoctorAppointmentItem {
  originalId?: number;
  [key: string]: unknown;
}

export interface DataCoreCategoryCatalog {
  getSpecialtyColumnItems(): readonly SpecialtyColumnItem[];
  getDoctorAppointmentItems(): readonly DoctorAppointmentItem[];
}

export type DataCoreHttpFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface DataCoreRuntimeConfigPort {
  isDevelopment: boolean;
  isDevRuntime(): boolean;
  isProvisioningContext(): boolean;
  getServerRuntimeContext(): {
    isNative: boolean;
    platform: string;
    isStatic: boolean;
    supportsServerApi: boolean;
    dataSource: string;
    isDevelopment: boolean;
    isProvisioning: boolean;
  };
  getTursoRuntimeCredentials(): TursoCredentials;
  getTursoProductRuntimeCredentials(): TursoCredentials;
  getTursoNotificationsRuntimeCredentials(): TursoCredentials;
  getTursoAdvertisementsRuntimeCredentials(): TursoCredentials;
  getTursoPlatformCredentials(): TursoPlatformCredentials;
  writeTursoRuntimeCredentials(url: string, authToken: string): void;
  writeTursoProductRuntimeCredentials(url: string, authToken: string): void;
  writeTursoAdvertisementsRuntimeCredentials(url: string, authToken: string): void;
  readOptionalEnv(key: string): string | undefined;
  listLibsqlDatabaseUrlKeys(): string[];
  asolHttpFetch: DataCoreHttpFetch;
  categoryCatalog: DataCoreCategoryCatalog;
}

function missing(name: string): never {
  throw new Error(`dataCoreRuntimeConfig: ${name} is not configured`);
}

const DEFAULTS: DataCoreRuntimeConfigPort = {
  isDevelopment: false,
  isDevRuntime: () => false,
  isProvisioningContext: () => false,
  getServerRuntimeContext: () => missing('getServerRuntimeContext'),
  getTursoRuntimeCredentials: () => missing('getTursoRuntimeCredentials'),
  getTursoProductRuntimeCredentials: () => missing('getTursoProductRuntimeCredentials'),
  getTursoNotificationsRuntimeCredentials: () => missing('getTursoNotificationsRuntimeCredentials'),
  getTursoAdvertisementsRuntimeCredentials: () => missing('getTursoAdvertisementsRuntimeCredentials'),
  getTursoPlatformCredentials: () => missing('getTursoPlatformCredentials'),
  writeTursoRuntimeCredentials: (url, authToken) => {
    process.env.TURSO_DATABASE_URL = url;
    process.env.TURSO_AUTH_TOKEN = authToken;
  },
  writeTursoProductRuntimeCredentials: (url, authToken) => {
    process.env.TURSO_PRODUCT_DATABASE_URL = url;
    process.env.TURSO_PRODUCT_AUTH_TOKEN = authToken;
  },
  writeTursoAdvertisementsRuntimeCredentials: (url, authToken) => {
    process.env.TURSO_ADVERTISEMENTS_DATABASE_URL = url;
    process.env.TURSO_ADVERTISEMENTS_AUTH_TOKEN = authToken;
  },
  readOptionalEnv: (key) => {
    const value = process.env[key];
    return value === undefined || value === '' ? undefined : value;
  },
  listLibsqlDatabaseUrlKeys: () =>
    Object.keys(process.env)
      .filter(
        (key) =>
          key.endsWith('_DATABASE_URL') &&
          (process.env[key] ?? '').trim().startsWith('libsql://'),
      )
      .sort(),
  asolHttpFetch: (input, init) => fetch(input, init),
  categoryCatalog: {
    getSpecialtyColumnItems: () => missing('categoryCatalog.getSpecialtyColumnItems'),
    getDoctorAppointmentItems: () => missing('categoryCatalog.getDoctorAppointmentItems'),
  },
};

/**
 * The registration lives on `globalThis`, not in this module's scope.
 *
 * A bundler is free to give the same source file more than one instance. Next
 * builds `instrumentation` and each route into separate chunks, and Turbopack
 * emitted two copies of this module: `src/instrumentation.ts` configured one
 * while every route handler read the other, which still held the defaults.
 * Production answered `getServerRuntimeContext is not configured` on every
 * server route — profile, notifications, system logs — while `typecheck`,
 * `architecture:check` and the full suite stayed green, because Node resolves
 * one path to one instance and only a bundled build splits them.
 *
 * A symbol keyed on the global object is the same value from whichever instance
 * asks. It is the one place per process, which is what "configure this once at
 * startup" actually means.
 */
const PORT_KEY = Symbol.for('@asol/data-core/runtime-config');

interface PortCarrier {
  [PORT_KEY]?: DataCoreRuntimeConfigPort;
}

function portState(): DataCoreRuntimeConfigPort {
  const carrier = globalThis as PortCarrier;
  carrier[PORT_KEY] ??= { ...DEFAULTS };
  return carrier[PORT_KEY];
}

function setPortState(next: DataCoreRuntimeConfigPort): void {
  (globalThis as PortCarrier)[PORT_KEY] = next;
}

export function configureDataCoreRuntimeConfig(
  next: Partial<DataCoreRuntimeConfigPort>,
): void {
  setPortState({ ...portState(), ...next });
}

export function resetDataCoreRuntimeConfig(): void {
  setPortState({ ...DEFAULTS });
}

export function dataCoreRuntimeConfig(): DataCoreRuntimeConfigPort {
  return portState();
}

/** Convenience accessors matching the former `@/core/config` imports. */
export function isDevelopment(): boolean {
  return portState().isDevelopment;
}

export function isDevRuntime(): boolean {
  return portState().isDevRuntime();
}

export function isProvisioningContext(): boolean {
  return portState().isProvisioningContext();
}

export function getServerRuntimeContext() {
  return portState().getServerRuntimeContext();
}

export function getTursoRuntimeCredentials() {
  return portState().getTursoRuntimeCredentials();
}

export function getTursoProductRuntimeCredentials() {
  return portState().getTursoProductRuntimeCredentials();
}

export function getTursoNotificationsRuntimeCredentials() {
  return portState().getTursoNotificationsRuntimeCredentials();
}

export function getTursoAdvertisementsRuntimeCredentials() {
  return portState().getTursoAdvertisementsRuntimeCredentials();
}

export function getTursoPlatformCredentials() {
  return portState().getTursoPlatformCredentials();
}

export function writeTursoRuntimeCredentials(url: string, authToken: string) {
  return portState().writeTursoRuntimeCredentials(url, authToken);
}

export function writeTursoProductRuntimeCredentials(url: string, authToken: string) {
  return portState().writeTursoProductRuntimeCredentials(url, authToken);
}

export function writeTursoAdvertisementsRuntimeCredentials(url: string, authToken: string) {
  return portState().writeTursoAdvertisementsRuntimeCredentials(url, authToken);
}

export function readOptionalEnv(key: string) {
  return portState().readOptionalEnv(key);
}

export function listLibsqlDatabaseUrlKeys() {
  return portState().listLibsqlDatabaseUrlKeys();
}

export function asolHttpFetch(input: RequestInfo | URL, init?: RequestInit) {
  return portState().asolHttpFetch(input, init);
}

export function categoryService(): DataCoreCategoryCatalog {
  return portState().categoryCatalog;
}
