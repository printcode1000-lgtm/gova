/**
 * Runtime environment flags — the only module that reads NODE_ENV / ASOL_MODE.
 */

export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';

export function isDevRuntime(): boolean {
  const explicitSource = process.env.ASOL_DATA_SOURCE?.trim().toLowerCase();
  if (process.env.VERCEL === '1' || process.env.VERCEL_ENV) return false;
  if (isStaticExportBuild() || isProvisioningContext()) return false;
  if (explicitSource === 'cloud') return false;
  if (explicitSource === 'local') return true;

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
