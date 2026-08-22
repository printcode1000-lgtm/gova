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
  getServerRuntimeContext(): { isDevelopment: boolean; isStatic: boolean; isProvisioning: boolean; [key: string]: unknown };
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

let port: DataCoreRuntimeConfigPort = { ...DEFAULTS };

export function configureDataCoreRuntimeConfig(
  next: Partial<DataCoreRuntimeConfigPort>,
): void {
  port = { ...port, ...next };
}

export function resetDataCoreRuntimeConfig(): void {
  port = { ...DEFAULTS };
}

export function dataCoreRuntimeConfig(): DataCoreRuntimeConfigPort {
  return port;
}

/** Convenience accessors matching the former `@/core/config` imports. */
export function isDevelopment(): boolean {
  return port.isDevelopment;
}

export function isDevRuntime(): boolean {
  return port.isDevRuntime();
}

export function isProvisioningContext(): boolean {
  return port.isProvisioningContext();
}

export function getServerRuntimeContext() {
  return port.getServerRuntimeContext();
}

export function getTursoRuntimeCredentials() {
  return port.getTursoRuntimeCredentials();
}

export function getTursoProductRuntimeCredentials() {
  return port.getTursoProductRuntimeCredentials();
}

export function getTursoNotificationsRuntimeCredentials() {
  return port.getTursoNotificationsRuntimeCredentials();
}

export function getTursoAdvertisementsRuntimeCredentials() {
  return port.getTursoAdvertisementsRuntimeCredentials();
}

export function getTursoPlatformCredentials() {
  return port.getTursoPlatformCredentials();
}

export function writeTursoRuntimeCredentials(url: string, authToken: string) {
  return port.writeTursoRuntimeCredentials(url, authToken);
}

export function writeTursoProductRuntimeCredentials(url: string, authToken: string) {
  return port.writeTursoProductRuntimeCredentials(url, authToken);
}

export function writeTursoAdvertisementsRuntimeCredentials(url: string, authToken: string) {
  return port.writeTursoAdvertisementsRuntimeCredentials(url, authToken);
}

export function readOptionalEnv(key: string) {
  return port.readOptionalEnv(key);
}

export function listLibsqlDatabaseUrlKeys() {
  return port.listLibsqlDatabaseUrlKeys();
}

export function asolHttpFetch(input: RequestInfo | URL, init?: RequestInit) {
  return port.asolHttpFetch(input, init);
}

export function categoryService(): DataCoreCategoryCatalog {
  return port.categoryCatalog;
}
