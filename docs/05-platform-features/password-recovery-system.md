# Password Recovery System

## Objective

The `src/features/password-recovery` module provides an independent password recovery flow via email. The user begins with their registered phone number, receives a 6-digit verification code, and sets a new password upon code verification.

## User Flow

1. The user navigates to `/forgot-password` and enters their registered Egyptian phone number.
2. The server generates a challenge valid for 10 minutes.
3. If the account is linked to an email address, Gmail sends the verification code and returns a masked email address like `h********@gmail.com`.
4. If no email is associated with the account, a button directing to `/contact-us` is displayed.
5. If the account does not exist, the app displays a generic message without confirming whether the phone number is registered.
6. After code verification, the server issues a separate random authorization token (`resetToken`).
7. The user submits the new password along with the authorization token; the challenge is then consumed and cannot be reused.

## Security Controls

- Code Expiration: 10 minutes.
- Phone Rate Limit: 3 requests per 15 minutes.
- IP Address Rate Limit: 12 requests per 15 minutes.
- Max Code Verification Attempts: 5 attempts.
- Verification codes, phone numbers, and IP addresses are never stored in plain text in the recovery table.
- Stored values utilize HMAC-SHA-256 with a server secret.
- Password reset token is a 256-bit random value, with only its hash stored.
- New passwords are hashed with scrypt (`scrypt$...`) via `@asol/auth-core/server`. Minimum length is 4 characters (`MIN_PASSWORD_LENGTH`).
- Error messages for invalid or expired codes are standardized.

> Masked email display and the "no email linked" status are UX requirements; therefore, they may reveal that a phone number is registered. Unregistered phone numbers do not return a `userNotFound` error code.

## Secret Configurations

The following values must be set in `.env.local` for development and in deployment environment variables for production:

```env
PASSWORD_RECOVERY_GMAIL_USER=suezbazaar@gmail.com
PASSWORD_RECOVERY_GMAIL_APP_PASSWORD=
PASSWORD_RECOVERY_SIGNING_SECRET=
```

- `PASSWORD_RECOVERY_GMAIL_APP_PASSWORD`: Google App Password generated after enabling 2-Step Verification. Never commit this to the repository.
- `PASSWORD_RECOVERY_SIGNING_SECRET`: A strong random string of at least 32 bytes, which must match across all server instances.
- Adding values to Vercel or server hosting environment variables is required; adding them locally does not automatically propagate them to production.

## API Endpoints

### `POST /api/auth/password-recovery/request`

Payload: `{ "phone": "01012345678" }`.

Response status: `sent` with masked email, `contactAdmin`, or `accepted` for generic response.

### `POST /api/auth/password-recovery/verify`

Payload: `{ "phone": "01012345678", "code": "123456" }`.

Returns a temporary `resetToken` upon successful verification.

### `POST /api/auth/password-recovery/reset`

Payload: phone number, `resetToken`, new password, and password confirmation. Consumes the challenge upon successful update.

## Database

A `password_recovery_challenges` table has been added to the user database, managed by Drizzle migration `0004`. The table includes challenge ID, phone hash, optional user ID, code hash, authorization token hash, timestamps, and attempt counts.

The development environment runs migrations automatically; synchronize the Turso database using:

```bash
npm run db:schema:sync
```

## Key Files

- `src/features/password-recovery/services/password-recovery-service.server.ts`: Flow logic and security rules.
- `src/features/password-recovery/services/password-recovery-email-service.server.ts`: Gmail dispatch service.
- `src/modules/data-access/domains/password-recovery/repositories/password-recovery-repository.ts`: Challenge storage repository.
- `src/features/password-recovery/components/PasswordRecoveryPageContent.tsx`: Multi-step UI component.
- `src/app/api/auth/password-recovery/*`: API routes.
- `src/modules/data-access/core/database/migrations/0004_breezy_cammi.sql`: Database migration file.

## Verification

```bash
npm run test:password-recovery
npm run test:auth-core
npm run typecheck
npm run lint
npm run architecture:check
```

## Related

- [auth-core-module.md](../01-architecture/auth-core-module.md)
