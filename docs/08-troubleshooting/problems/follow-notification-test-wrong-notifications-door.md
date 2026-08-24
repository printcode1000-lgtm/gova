# Follow notification test imports the wrong notifications door

## Symptom

`npm run test:follow` fails before exercising follower notification behavior:

```text
TypeError: registerNotificationsCorePorts is not a function
```

The failure occurs in `src/features/follow/tests/follower-notification.test.ts`.

## Root cause

The test dynamically imported `@/features/notifications`, the behavioural/public feature door, and then attempted to call the server composition function `registerNotificationsCorePorts()`.

That registration is intentionally exported from `@/features/notifications/server`, not the public notifications door. `FollowService` already uses the server door for its server-only notification dependency.

## Fix

Import `registerNotificationsCorePorts` from:

```text
@/features/notifications/server
```

Do not re-export the registration function from the public notifications entry point just to satisfy a test. Server composition APIs must remain behind the server door.

## Verification

Run:

```bash
npm run test:follow
```

The test already runs with `NODE_OPTIONS=--conditions=react-server`, so the server-only feature door is the intended runtime for this contract.
