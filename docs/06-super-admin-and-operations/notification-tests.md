# Super Admin Notification Tests

`/super-admin/notification-tests` is a diagnostic console for notification
channels, custom sound, device registration, and end-to-end provider delivery.
It is linked under **Super Admin → Notifications** beside the production
broadcast page.

## Safety boundary

- Both the page and `POST /api/notifications/test/send` require the configured
  Super Admin identity. The API verifies the signed session header and derives
  the identity from its claims; it never trusts identity fields in the body.
- A remote test always derives its only recipient from the authenticated Super
  Admin uid. The request cannot supply another uid or broadcast to users.
- The server accepts a known scenario id rather than arbitrary category,
  priority, sound, or metadata values.
- Every send receives a unique `notification-test:<requestId>` dedupe key.
- The server issues the same short-lived signed grant used by production
  notification flows. The browser carries it to the isolated notifications
  service; no FCM or APNs secret reaches the main application.

## Test modes

### Local

The page creates Android channels and schedules a local notification through
the Native Platform facade. This isolates packaging, permission, channel, and
custom-sound problems from the remote provider.

### Real Push

The page calls `POST /api/notifications/test/send`. The main app signs a grant
for the Super Admin uid, then the notification bridge asks the notifications
service to deliver it through FCM, APNs, or Web Push. The UI reports the real
provider outcome and token count.

If Local succeeds but Real Push fails, investigate registration, the deployed
notifications service, and provider credentials. If both fail on Android,
investigate permission, channel settings, and the packaged sound resource.

## Scenarios

| Scenario | Android channel | Expected sound |
| --- | --- | --- |
| General | `asol_general_v3` | `custom_notification.mp3` |
| Orders | `asol_orders_v3` | `custom_notification.mp3` |
| Chat | `asol_chat_v3` | `custom_notification.mp3` |
| Updates | `asol_updates_v3` | `custom_notification.mp3` |
| Urgent | `asol_urgent_v3` | `custom_notification.mp3` |
| Silent control | `asol_silent_v3` | none |

The shared definitions live in
`src/features/notifications/domain/notification-test-scenarios.ts`. Contract
tests verify that each displayed scenario resolves to the advertised Android
channel and that its audible label matches its sound value.

## Background and locked-screen checks

The delay selector gives the tester time to background the application or lock
the screen. The page must remain alive until its countdown finishes; it does
not pretend to be a durable server scheduler. After the send has started, a
real Push test can be observed with the application foregrounded, backgrounded,
or terminated.
