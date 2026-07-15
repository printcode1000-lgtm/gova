/**
 * Runtime environment flags — the only module that reads NODE_ENV / ASOL_MODE.
 */

export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';

export function isDevRuntime(): boolean {
  if (process.env.VERCEL === '1' || process.env.VERCEL_ENV) return false;
  if (
    process.env.TURSO_DATABASE_URL ||
    process.env.TURSO_PROFILE_DATABASE_URL ||
    process.env.TURSO_PRODUCT_DATABASE_URL ||
    process.env.TURSO_ADVERTISEMENTS_DATABASE_URL
  ) {
    return false;
  }

  return (
    process.env.NEXT_PUBLIC_ASOL_MODE === 'development' ||
    process.env.ASOL_MODE === 'development' ||
    process.env.NODE_ENV === 'development'
  );
}

export function isStaticExportBuild(): boolean {
  return process.env.ASOL_MODE === 'static' || process.env.GITHUB_ACTIONS === 'true';
}

export function isProvisioningContext(): boolean {
  return process.env.ASOL_PROVISIONING === 'true';
}
