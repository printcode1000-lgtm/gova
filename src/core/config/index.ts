export { isDevRuntime, isStaticExportBuild, isProvisioningContext, getServerRuntimeContext } from "./runtime-context.server";
import { getServerRuntimeContext } from "./runtime-context.server";
export const isDevelopment = getServerRuntimeContext().isDevelopment;
export const isProduction = !isDevelopment;

export type { AppDataSource, AppDeployment, AppPlatform, AppRuntimeContext } from './runtime-context';

export { publicEnv, withBasePath } from './public-env';
