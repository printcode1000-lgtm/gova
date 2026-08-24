/**
 * Client entry point for auth — HTTP adapter only.
 * Server routes import through the server door.
 */
export { authApiService as authService } from './auth-api-service';
export type { IAuthService } from '../../ports/auth-service.interface';