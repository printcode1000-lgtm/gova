/**
 * Client entry point for profile — HTTP adapter only.
 * Server routes import from profile-service.bootstrap.server.ts directly.
 */
export { profileApiService as profileService } from './profile-api-service';
export type { IProfileService } from './profile-service.interface';
