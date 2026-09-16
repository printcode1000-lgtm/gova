import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const productionFiles = [
  'src/features/auth/application/hooks/use-phone-verification.ts',
  'src/features/auth/presentation/PhoneVerification.tsx',
  'src/features/auth/presentation/hooks/use-register.ts',
  'src/features/auth/presentation/hooks/use-profile-registration.ts',
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

console.log('Phone verification anti-regression guard passed.');
