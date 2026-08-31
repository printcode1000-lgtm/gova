import 'server-only';

/** Server-only OTA administration seam; excludes native update runtime. */
export { configureOtaCore, resetOtaCorePorts } from './ports';
export { otaReleaseService } from './runtime/release-service.server';
export type { SetOtaReleaseApprovalInput } from './domain/release/manifest-types';
