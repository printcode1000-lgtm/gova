export interface PhoneVerificationRuntime {
  developmentBuild: boolean;
}

/** OTP is bypassed only in a real `next dev` client bundle, never in production/static builds. */
export function shouldBypassPhoneVerification(
  runtime: PhoneVerificationRuntime,
): boolean {
  return runtime.developmentBuild;
}
