/**
 * Client entry point for auth — HTTP adapter only.
 * Server routes import from auth-service.server.ts directly.
 */
export { authApiService as authService } from './auth-api-service';
export type { IAuthService } from './auth-service.interface';
