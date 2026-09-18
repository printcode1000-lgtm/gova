# Explicit error statuses answered as `400`, and notification errors as `500`

## Symptom

- A rate-limited request (`passwordRecoveryRateLimited`, `verificationRateLimited`,
  `contactRateLimited`, …) answered `400`, not `429`.
- A missing server configuration (`mobilePushUnlockNotConfigured`,
  `sessionSigningSecretNotConfigured`, …) answered `400`, not `503`.
- `mobilePushCredentialBlobMismatch` answered `400`, not `403`.
- A malformed notification request — `notificationPreferenceInvalid`,
  `notificationPlatformInvalid`, `notificationGrantInvalid`, … — answered
  `500 internalServerError`, and the client never saw the code.

## Scope / Preconditions

Every runtime that maps a thrown business code through
`businessApiErrorStatus` (`src/core/api/business-api-error-status.ts`): the
application's `mapServiceError`, and the service accounts'
`businessErrorResponse`.

## Root Cause

Two independent gaps in one function.

1. **Precedence.** It checked the generic `KNOWN_400` set before
   `EXPLICIT_STATUSES`. `KNOWN_400` is built from every known business code minus
   a short exclusion list, and nearly every explicit code is also a known code,
   so the explicit `429`, `403` and `503` entries were unreachable.
2. **Unmapped codes.** Codes thrown by device registration, the mute switch and
   grant verification were in neither table, so they fell through to `500`. The
   preferences route even carried a comment calling its code "mapped".

## Diagnosis

```bash
npx tsx -e "import('./src/core/api/business-api-error-status.ts').then(m => console.log(m.businessApiErrorStatus('passwordRecoveryRateLimited')))"
```

`status: 400` confirms the precedence bug; `status: 500` for a notification code
confirms it is unmapped.

## Fix

- `businessApiErrorStatus` consults `EXPLICIT_STATUSES` first, then `KNOWN_400`.
- The notification input codes joined `KNOWN_BUSINESS_API_ERROR_CODES` (`400`),
  and `notificationGrantNotIssued` got an explicit `503`.

Clients are unaffected by the status change: they branch on the code, and
`sanitizeApiErrorCodeForClient` passes a known code through at any status.

## Prevention

`src/features/notifications/tests/notification-error-status.test.ts` collects
every code thrown on the notification server paths from source and fails if one
maps to `500`, and pins the statuses clients branch on — including the explicit
ones the precedence bug had hidden.

## Related Surfaces

- `src/core/api/business-api-error-status.ts`
- `src/core/api/business-api-error-codes.ts`
- `services/*/src/app/lib/http.ts` (`businessErrorResponse`)
