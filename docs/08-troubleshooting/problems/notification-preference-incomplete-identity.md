# Notification Preference Forbidden from Incomplete Identity

## Symptom

`GET /api/notifications/preferences` can report `forbidden` when the client has a persisted session with a `uid` but no usable phone number, or when the same Egyptian phone is represented with different display formatting such as `010...` versus `+20 10...`.

## Cause

The notification settings surface used `uid` alone as the condition for issuing account-level preference calls, while the server authorises notification account operations with both `uid` and phone. The server also compared phone strings byte-for-byte, so equivalent formatted forms could be rejected.

## Fix

- Notification settings do not issue account-level notification operations until both `session.uid` and `session.phone` are present.
- `NotificationTokenService` compares phone identity using a digit-normalized Egyptian canonical form while still requiring a non-empty match.
- The root provider contract keeps `PreferencesProvider` above `NotificationsFeatureBridge`, because notification prompts use `useTranslation()` and require `LocaleRuntimeProvider` before they render.

## Guard

`src/features/notifications/tests/notification-account-surface.test.ts` protects the complete-identity requirement, phone normalization, and locale-provider ordering.
