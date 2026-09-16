# Password Recovery System

## Objective

The `src/features/password-recovery` module lets a user recover access by proving control of the registered phone through the unified verification system, then setting a new password.

Phone validation and normalization are not owned by password recovery. `normalizeRecoveryPhone()` delegates to the canonical Egyptian mobile-phone rule exported by `@asol/auth-core`; the recovery layer only maps an invalid canonical phone to the recovery-specific error key. This keeps registration, login, profile updates, and recovery on one phone source of truth.

## User Flow

1. The user navigates to `/forgot-password` and enters their registered phone number.
2. The server creates a `password_recovery` challenge in `verification_challenges`.
3. International numbers receive the 6-digit code by the verified email channel and return a masked email address like `h********@gmail.com`.
4. Egyptian numbers use the admin SMS dispatch path owned by the unified verification system.
5. If the account does not exist, the app displays a generic message without confirming whether the phone number is registered.
6. After code verification, the server issues a short-lived signed `verificationProof`, exposed to the UI as `resetToken`.
7. The user submits the new password along with the proof; the challenge is consumed and cannot be reused.

## Security Controls

- Code Expiration: 10 minutes.
- Phone Rate Limit: 3 requests per 15 minutes.
- IP Address Rate Limit: 12 requests per 15 minutes.
- Max Code Verification Attempts: 5 attempts.
- Verification codes and request IP addresses are stored as HMAC-SHA-256 digests.
- Password reset authority is a signed verification proof, not a reusable client boolean or locally generated token.
- New passwords are hashed with scrypt (`scrypt$...`) via `@asol/auth-core/server`. Minimum length is 4 characters (`MIN_PASSWORD_LENGTH`).
- Error messages for invalid or expired codes are standardized.

> Masked email display and the "no email linked" status are UX requirements; therefore, they may reveal that a phone number is registered. Unregistered phone numbers do not return a `userNotFound` error code.

## Secret Configurations

The following values must be set in `.env.local` for development and in deployment environment variables for production:

```env
PASSWORD_RECOVERY_GMAIL_USER=suezbazaar@gmail.com
PASSWORD_RECOVERY_GMAIL_APP_PASSWORD=
ASOL_VERIFICATION_SIGNING_SECRET=
```

- `PASSWORD_RECOVERY_GMAIL_APP_PASSWORD`: Google App Password generated after enabling 2-Step Verification. Never commit this to the repository.
- `ASOL_VERIFICATION_SIGNING_SECRET`: A strong random string of at least 32 bytes, which must match across all server instances. If unset, the server falls back to `ASOL_SESSION_SIGNING_SECRET`.
- Adding values to Vercel or server hosting environment variables is required; adding them locally does not automatically propagate them to production.

## API Endpoints

### `POST /api/auth/password-recovery/request`

Payload: `{ "phone": "01012345678" }`.

Response status: `sent` with masked email, `contactAdmin`, or `accepted` for generic response.

### `POST /api/auth/password-recovery/verify`

Payload: `{ "challengeId": "vch_...", "phone": "01012345678", "code": "123456" }`.

Returns a temporary `resetToken` upon successful verification.

### `POST /api/auth/password-recovery/reset`

Payload: phone number, `resetToken`, new password, and password confirmation. Consumes the challenge upon successful update.

## Database

Password recovery stores its challenges in the shared `verification_challenges` table in the users database, with no separate code lifecycle of its own.

The legacy `password_recovery_challenges` table has been retired: its repository, its schema ownership, and its account-deletion entry are all gone, so no code path reads or writes it. Its ten-minute challenge TTL long predates the cutover, so no live challenge could have survived. Schema sync runs with exact cleanup disabled, so the physical table lingers harmlessly in existing databases until a deliberate operator-run exact cleanup drops it — nothing in the application depends on either outcome.

The development environment runs migrations automatically; synchronize the Turso database using:

```bash
npm run db:schema:sync
```

## Key Files

- `src/features/password-recovery/server/services/password-recovery-service.server.ts`: Flow logic and security rules.
- `src/features/verification/server/services/verification-service.server.ts`: Shared verification challenge, code, and proof service.
- `packages/auth-core/src/domain/phone.ts`: Canonical Egyptian mobile-phone validation and normalization shared with the real auth flows.
- `packages/data-core/src/domains/verification/repositories/verification-challenge-repository.ts`: Shared challenge storage repository.
- `src/features/password-recovery/presentation/PasswordRecoveryPageContent.tsx`: Multi-step UI component.
- `src/app/api/auth/password-recovery/*`: API routes.
- `packages/data-core/src/core/database/migrations/0004_breezy_cammi.sql`: Database migration file.

## Verification

```bash
npm run test:password-recovery
npm run test:auth-core
npm run typecheck
npm run lint
npm run architecture:check
```

## Related

- [auth-core-module.md](../05-platform-features/auth-core-module.md)
- [unified-verification-system.md](./unified-verification-system.md)
