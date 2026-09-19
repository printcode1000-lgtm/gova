# Egyptian verification sends nothing: the data-only dispatch was refused as contentless, and the 200 hid it

## Symptom

On `/registration`, requesting a code for an Egyptian `+20` number succeeds in the UI, but the Super Admin's Android phone receives no push and SMS Sender sends nothing. The challenge row stays in `dispatch_pending` with `dispatch_status = 'pending'` and no `dispatch_failure_code`, until it expires. The notifications deployment logs `POST /api/notifications/send` → `200` with no error line. `logcat` on the gateway phone shows no `AsolNotifications` / `AsolVerificationSms` entry.

## Root Cause

Two defects, one masking the other:

1. The verification dispatch is a data-only signal and deliberately carries an empty `title` and `body`. `NotificationSendService.sendToUsersLocally()` required text on every non-template send and threw `notificationContentRequired`, so FCM was never called.
2. `/api/notifications/send` answers `200` for any well-formed request and reports per-grant rejections in the body. `postNotificationGrantToService()` treated any `2xx` as delivered, so the verification service recorded a successful dispatch.

## Diagnosis

- Read the newest `verification_challenges` row: `dispatch_pending`, `dispatch_status = 'pending'`, `dispatch_redeemed_at` null.
- Confirm the Super Admin has an enabled Android `fcm` row in `user_notification_tokens` (otherwise the failure is `verificationSmsGatewayUnavailable`, a different record).
- `vercel logs -p asol-notifications --json` shows the `send` request at the challenge's `updated_at` with status `200`.

## Fix

- A send whose `metadata.dataOnly === true` no longer requires text; visible sends still do.
- The courier reads the response body and reports `delivered` only when some recipient reached a device (`sent`, `partial`, or `queued`) — the same rule the development transport already used. Anything else is `undelivered`, which the verification service records as `dispatchUndeliverable` and surfaces as the retriable `verificationDispatchFailed`.

Both changes are server-only (`@asol/notifications-core`). The notifications deployment and the `submain` deployment must both be redeployed; no app rebuild is needed.

## Prevention

`npm run test:notifications-core` runs `data-only-grant-delivery.test.ts`, which sends a text-less data-only notification through the real send service and checks that the courier refuses a `200` carrying a rejection or reaching no device.

## Related Surfaces

- `packages/notifications-core/src/services/notification-send-service.server.ts`
- `packages/notifications-core/src/services/notification-grant-courier.server.ts`
- `src/features/notifications/server/services/verification-sms-dispatch.service.server.ts`
- [Unified Verification System](../../05-platform-features/unified-verification-system.md)
