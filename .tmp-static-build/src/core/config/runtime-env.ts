/**
 * Runtime environment flags — the only module that reads NODE_ENV / GOVA_MODE.
 */

export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';

export function isDevRuntime(): boolean {
  return (
    process.env.NEXT_PUBLIC_GOVA_MODE === 'development' ||
    process.env.GOVA_MODE === 'development' ||
    process.env.NODE_ENV === 'development'
  );
}

export function isStaticExportBuild(): boolean {
  return process.env.GOVA_MODE === 'static' || process.env.GITHUB_ACTIONS === 'true';
}

export function isProvisioningContext(): boolean {
  return process.env.GOVA_PROVISIONING === 'true';
}
