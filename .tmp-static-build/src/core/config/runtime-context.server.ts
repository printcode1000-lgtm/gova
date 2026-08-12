import { resolveServerRuntime } from "./runtime-context";

export function getServerRuntimeContext() {
  return resolveServerRuntime({
    nodeEnv: process.env.NODE_ENV,
    mode: process.env.ASOL_MODE,
    publicMode: process.env.NEXT_PUBLIC_ASOL_MODE,
    vercel: process.env.VERCEL,
    vercelEnv: process.env.VERCEL_ENV,
    dataSource: process.env.ASOL_DATA_SOURCE,
    provisioning: process.env.ASOL_PROVISIONING,
    githubActions: process.env.GITHUB_ACTIONS,
  });
}

export function isDevRuntime(): boolean {
  return getServerRuntimeContext().isDevelopment;
}

export function isStaticExportBuild(): boolean {
  return getServerRuntimeContext().isStatic;
}

export function isProvisioningContext(): boolean {
  return getServerRuntimeContext().isProvisioning;
}
