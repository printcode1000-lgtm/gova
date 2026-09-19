import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const productionFiles = [
  'src/features/auth/application/hooks/use-phone-verification.ts',
  'src/features/auth/presentation/OtpInput.tsx',
  'src/features/auth/presentation/PhoneVerification.tsx',
  'src/features/auth/presentation/hooks/use-register.ts',
  'src/features/auth/presentation/hooks/use-profile-registration.ts',
  'src/features/profile/presentation/ProfileRegistrationInfoCard.tsx',
  'src/features/password-recovery/presentation/PasswordRecoveryPageContent.tsx',
  'src/shared/app-init/build-app-init-script.ts',
  'packages/auth-core/src/validation/auth-schemas.ts',
  'packages/auth-core/src/server/auth-operations-service.ts',
  // Generated but shipped: the browser executes these before the app boots, so a
  // stale regeneration is a live legacy OTP transport, not a build artifact.
  'public/asol-app-init.js',
  'public/asol-theme-init.js',
];

const forbidden = [
  /sendWhatsappVerificationCode/,
  /wa_msg_template/,
  /generatedOtp/,
  /generateOtp/,
  /wa\.me/,
  /window\.open\([^)]*whatsapp/i,
  /phoneVerified\s*:\s*z\.boolean/,
];

for (const file of productionFiles) {
  const source = readFileSync(path.join(process.cwd(), file), 'utf8');
  for (const pattern of forbidden) {
    assert.doesNotMatch(source, pattern, `${file} reintroduces legacy client OTP verification: ${pattern}`);
  }
}

const verificationCodeLengthFiles = [
  'packages/verification-core/src/index.ts',
  'packages/verification-core/src/server.ts',
  'src/features/verification/server/services/verification-service.server.ts',
  'src/features/auth/application/hooks/use-phone-verification.ts',
  'src/features/auth/presentation/OtpInput.tsx',
  'src/features/auth/presentation/PhoneVerification.tsx',
  'src/features/profile/presentation/ProfileRegistrationInfoCard.tsx',
  'src/features/password-recovery/presentation/PasswordRecoveryPageContent.tsx',
  'src/features/password-recovery/presentation/hooks/use-password-recovery.ts',
];

const forbiddenSixDigitCodePatterns = [
  /VERIFICATION_CODE_LENGTH\s*=\s*6/,
  /\\d\{6\}/,
  /otp\.length\s*!==\s*6/,
  /slice\(0,\s*6\)/,
  /maxLength=\{6\}/,
  /6-digit/i,
  /6 أرقام/,
];

for (const file of verificationCodeLengthFiles) {
  const source = readFileSync(path.join(process.cwd(), file), 'utf8');
  for (const pattern of forbiddenSixDigitCodePatterns) {
    assert.doesNotMatch(source, pattern, `${file} reintroduces a six-digit verification code contract: ${pattern}`);
  }
}

const hookSource = readFileSync(
  path.join(process.cwd(), 'src/features/auth/application/hooks/use-phone-verification.ts'),
  'utf8',
);
assert.match(hookSource, /verificationApiService\.request/, 'phone verification must request a server challenge');
assert.match(hookSource, /verificationApiService\.verify/, 'phone verification must verify through the server');
assert.doesNotMatch(hookSource, /Math\.random\(\).*otp|random.*otp/i, 'the client must not generate OTP values');

const registrationSource = readFileSync(
  path.join(process.cwd(), 'src/features/auth/server/services/auth-service.server.ts'),
  'utf8',
);
assert.match(registrationSource, /verificationProofConsumer\.consume/, 'protected auth operations must consume verification proof server-side');
assert.doesNotMatch(registrationSource, /phoneVerified/, 'auth server must not accept phoneVerified as authority');

const resendRoute = readFileSync(
  path.join(process.cwd(), 'src/app/api/verification/resend/route.ts'),
  'utf8',
);
assert.match(resendRoute, /verificationService\.resend/, 'resend must rotate an existing challenge, not create a new one');

const profileRegistrationSource = readFileSync(
  path.join(process.cwd(), 'src/features/profile/presentation/ProfileRegistrationInfoCard.tsx'),
  'utf8',
);
assert.match(
  profileRegistrationSource,
  /<PhoneVerification[\s\S]*purpose="primary_phone_change"/,
  'profile phone edits must use the shared four-digit phone verification flow',
);

const phoneVerificationSource = readFileSync(
  path.join(process.cwd(), 'src/features/auth/presentation/PhoneVerification.tsx'),
  'utf8',
);
assert.match(phoneVerificationSource, /otp\.length !== VERIFICATION_CODE_LENGTH/, 'registration and profile verification must use the central four-digit length');

const otpInputSource = readFileSync(
  path.join(process.cwd(), 'src/features/auth/presentation/OtpInput.tsx'),
  'utf8',
);
assert.match(otpInputSource, /length = VERIFICATION_CODE_LENGTH/, 'OTP input must default to the central verification-code length');

const recoveryPageSource = readFileSync(
  path.join(process.cwd(), 'src/features/password-recovery/presentation/PasswordRecoveryPageContent.tsx'),
  'utf8',
);
assert.match(recoveryPageSource, /maxLength=\{VERIFICATION_CODE_LENGTH\}/, 'password recovery input must use the central four-digit length');
assert.match(recoveryPageSource, /disabled=\{code\.length !== VERIFICATION_CODE_LENGTH\}/, 'password recovery must not submit until exactly four digits are entered');

const recoveryHookSource = readFileSync(
  path.join(process.cwd(), 'src/features/password-recovery/presentation/hooks/use-password-recovery.ts'),
  'utf8',
);
assert.match(recoveryHookSource, /VERIFICATION_CODE_LENGTH/, 'password recovery hook must reject non-four-digit codes before the network request');

console.log('Phone verification anti-regression guard passed.');
