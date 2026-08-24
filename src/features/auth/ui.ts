/**
 * Public ui door for `@/features/auth/ui`.
 * Cross-feature consumers MUST import through this file only.
 */
/* BEGIN GENERATED FEATURE DOOR EXPORTS */
/** Auto-maintained sealed-door re-exports. Do not edit by hand. */
export * from './application/auth-lifecycle-events';
export * from './presentation/hooks/use-logout';
export * from './presentation/hooks/use-profile-registration';
export * from './presentation/AccountDeletionPageContent';
export * from './presentation/AuthHero';
export * from './presentation/AuthLoginBootstrapController';
export * from './presentation/AuthMobileBrand';
export * from './presentation/LoginPageContent';
export * from './presentation/LoginRequiredDialog';
export * from './presentation/LoginSuccessToast';
export * from './presentation/PhoneVerification';
export * from './presentation/RegistrationPageContent';
export * from './presentation/SessionProvider';
/** Browser session / auth lifecycle — never on the application door (mirror walk). */
export * from './application/services/session-service';
/* END GENERATED FEATURE DOOR EXPORTS */