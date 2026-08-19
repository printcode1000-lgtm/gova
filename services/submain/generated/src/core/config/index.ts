export { isDevRuntime, isStaticExportBuild, isProvisioningContext, getServerRuntimeContext } from "./runtime-context.server";
import { getServerRuntimeContext } from "./runtime-context.server";
export const isDevelopment = getServerRuntimeContext().isDevelopment;
export const isProduction = !isDevelopment;

export type { AppDataSource, AppDeployment, AppPlatform, AppRuntimeContext } from './runtime-context';

/**
 * `publicEnv` is deliberately NOT re-exported here.
 *
 * It declares every sibling deployment's origin — `notificationsUrl`, `productsUrl`,
 * `ordersUrl`, `profilesUrl`. This barrel is imported by the monitor and the database
 * clients, which are mirrored into `services/*​/generated/`, so re-exporting it dragged
 * the full cross-account origin table into three of the four service deployments.
 *
 * That made every one of them carry a code path to the others — latent only because no
 * deploy script pushes `NEXT_PUBLIC_ASOL_*_URL` to a service account, and one mistaken
 * env push away from being real. Rule 0: no account may know another exists.
 *
 * Import it from `@/core/config/public-env` directly. `services/orders` was always clean
 * for exactly this reason: its graph never reached this barrel's `publicEnv` re-export.
 */
