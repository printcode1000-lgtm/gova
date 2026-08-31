import 'server-only';

/** Exact publishing capabilities consumed by the control-owned build-job runner. */
export { appStoreConnectCredentialsAreReady, requireIosProductionNativeVersion } from './publishing/adapters/app-store-connect.adapter';
export { createGooglePlayAuthClient, googlePlayCredentialsAreReady, requireGooglePlayProductionNativeVersion, resolveGooglePlayCredentials, type GooglePlayCredentialStatus } from './publishing/adapters/google-play.adapter';
export { readShippingPlatformsDeclaration } from './publishing/config/shipping-platforms';
export { getOtaApprovalServerConfig } from './publishing/config/ota-r2-target';
