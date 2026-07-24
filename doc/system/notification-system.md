# ASOL Notification System

> Specialty-based buyer/provider conversations are documented in [`specialty-notification-chat.md`](specialty-notification-chat.md). They use notifications as their sole transport and keep message content only in the local notification center.

Notification bodies and notification-center rows have no SQLite/Turso table. Device tokens, push-provider credentials, and per-user delivery preferences are server metadata only; actual notification cards, lifecycle analytics, badges, receipts, and conversation messages are persisted exclusively in AsolDB IndexedDB on the current client.

> Android production setup and operational checks are documented in
> [`../capacitor/android-push-notifications.md`](../capacitor/android-push-notifications.md).

The notification system is a local-first module that powers the in-app notification center, badge count, template rendering, event mapping, device-token storage, and future push integrations for Web, Android, and iOS.

## Implemented Now

- A complete module exists under `src/features/notifications`.
- `/notifications` now opens the notification center from the bottom navigation bar.
- The bottom navigation notification badge reads the real unread count from AsolDB and is hidden when the count is zero.
- Badge counts include only unread notifications that target `badge`.
- Notifications persist locally in AsolDB IndexedDB stores.
- Templates live only in JSON files: Arabic and English.
- Business modules publish through `NotificationBus`; they do not talk directly to push providers.
- Event-to-template mapping is available for orders, shipments, returns, chat, payments, offers, and system notices.
- Deduplication uses `dedupeKey`; duplicate entries are not stored again.
- Dismissed notifications store their `id` and `dedupeKey` locally so Web Push or Android tray imports do not restore items the user already deleted.
- Notification lifecycle analytics are stored locally.
- Optional Capacitor-facing services are isolated behind infrastructure services.
- Push provider credentials are not present in the client.
- Device tokens are now stored in the users database in `user_notification_tokens`, locally and in Turso after schema sync.
- Server APIs support registering/removing a device token and preparing notification delivery to one user or many users.
- Push delivery now uses a server-side provider interface and registry instead of direct coupling to FCM, APNs, or Web Push.

## Folder Structure

```text
src/features/notifications/
├── application/
├── config/
│   └── templates/
├── domain/
├── infrastructure/
│   └── capacitor/
├── presentation/
│   └── hooks/
├── shared/
├── tests/
└── index.ts
```

## Architecture

The module follows a layered structure:

- `domain`: typed entities, enums, defaults, and contracts.
- `application`: use-case services such as the bus, builder, sender, receiver, router, sync, lifecycle, permissions, tokens, and analytics.
- `infrastructure`: local AsolDB persistence and platform adapters.
- `presentation`: React page and hooks.
- `config`: notification templates in JSON.
- `shared`: small reusable helpers.
- `tests`: module-level contract checks.

## AsolDB Storage

The module uses the existing `AsolDB` IndexedDB database. The database version is `8`.

Dedicated stores:

- `notifications`
- `notificationDeviceTokens`
- `notificationSettings`
- `notificationBadges`
- `notificationAnalytics`
- `notificationOfflineQueue`

Templates are intentionally excluded from AsolDB. They are static versioned files inside the app bundle.

The `notificationSettings` store also contains the bounded
`user:<uid>:dismissed` list. The list stores notification `id` and `dedupeKey`
values for deleted center items and is used to reject later imports of the same
notification from Web Push service-worker payloads or Android delivered
notifications.

## Users Database Token Storage

Push/device tokens that must be available to the backend are stored in the users database, not in the local notification center stores.

Table:

```text
user_notification_tokens
```

Columns:

- `id`
- `uid`
- `platform`: `web`, `android`, or `ios`
- `provider`: `web_push`, `fcm`, `apns`, `capacitor`, or another provider key
- `device_id`
- `token`
- `enabled`
- `last_seen_at`
- `created_at`
- `updated_at`
- `deleted_at`

Indexes:

- `user_notification_tokens_uid_idx`
- `user_notification_tokens_uid_device_unique`
- `user_notification_tokens_token_unique`

This table supports multiple devices per user and allows disabling one device without changing the user account.

## Notification Lifecycle

1. A module publishes a custom notification, template notification, or business event through `NotificationBus`.
2. `EventNotificationMapper` converts business events into template IDs.
3. `NotificationBuilder` resolves the template, variables, deep link, priority, channels, targets, group key, and sound.
4. `NotificationSender` stores the notification in AsolDB, applies routing, updates badge count, emits UI refresh events, and records analytics.
5. The notification center reloads through `useNotifications`.
6. Opening, marking all as read, or dismissing a notification updates badge state and emits a UI refresh event so `/notifications` and the bottom bar stay in sync.
7. Dismissing a notification also remembers its `id` and `dedupeKey`; repeated Web Push or Android tray imports with the same identity are ignored.

## Notification Bus

`NotificationBus` is the only entry point for business modules.

Supported publish methods:

- `publishTemplate(input)`
- `publishCustom(input)`
- `publishEvent(event, locale)`

Every notification must include a stable `dedupeKey`. Optional `notificationId` can be supplied by the caller when an upstream event already has a stable ID.

## Event Mapping

Initial mappings:

| Event | Template |
|-------|----------|
| `orders.created` | `order.created` |
| `orders.updated` | `order.updated` |
| `orders.sellerAccepted` | `order.sellerAccepted` |
| `orders.sellerRejected` | `order.sellerRejected` |
| `shipments.updated` | `shipment.updated` |
| `returns.requested` | `return.requested` |
| `chat.messageCreated` | `message.new` |
| `payments.received` | `payment.received` |
| `offers.received` | `offer.received` |
| `system.info` | `system.info` |

Business modules should publish events with variables such as `orderId`, `orderNumber`, `status`, `productName`, `sellerName`, `amount`, `chatId`, and `offerId`.

## Templates

Templates are JSON objects keyed by template ID.

Arabic:

```text
src/features/notifications/config/templates/notifications.ar.json
```

English:

```text
src/features/notifications/config/templates/notifications.en.json
```

Template format:

```json
{
  "order.created": {
    "title": "Order created",
    "body": "Your order {{orderNumber}} was created successfully.",
    "category": "orders",
    "priority": "high",
    "channels": ["in_app"],
    "targets": ["center", "badge", "popup"],
    "deepLink": { "href": "/orders/{{orderId}}", "label": "View order" },
    "groupKey": "orders",
    "sound": "default"
  }
}
```

The template loader validates category, priority, channels, targets, and sound at runtime.

## Localization

The builder accepts `locale: "ar" | "en"` and loads the matching JSON template set. Variables use `{{variableName}}` replacement.

## Channels

Channels describe delivery paths:

- `in_app`
- `web_push`
- `android_push`
- `ios_push`

Routing is separate from presentation targets.

## Targets

Targets describe where the notification appears:

- `center`
- `badge`
- `popup`
- `home`
- `orders`
- `chat`
- `buyer_dashboard`
- `seller_dashboard`
- `admin_dashboard`

The current UI uses `center`, `badge`, and popup events. Other targets are ready for future dashboards.

## Priority

Supported priorities:

- `low`
- `normal`
- `high`
- `critical`

Critical notifications are routed to all push channels and popup target by `NotificationRouter`.

## Deep Linking

Each notification can include a route:

```ts
route: { href: "/orders/ord_123", label: "عرض الطلب" }
```

The notification center marks the item as read before navigating.

Location-based shipping quote transitions use deduplicated high-priority custom
notifications. A new proposal opens the order as the buyer; acceptance or
rejection opens it in the seller/provider view. Payload metadata contains the
order ID, quote ID, quote status, and integer minor-unit amount. Notification
content received by the client follows the normal local-only AsolDB retention
policy.

Unified delivery plans use the same notification pipeline. Candidate providers
receive one deduplicated high-priority invitation for the plan. New or revised
offers notify the buyer; acceptance, rejection, and selection of separate
delivery notify the relevant provider. Payload metadata identifies the order,
plan, quote, transition, and accepted minor-unit total when applicable. Push is
only a transport signal: authoritative plan and quote state lives in the
marketplace-orders database, while notification-center copies remain local-only
in AsolDB/IndexedDB.

## Device Token Flow

`DeviceTokenService` owns token registration, listing, and removal.

Current behavior stores a safe pending token placeholder until a real push provider plugin is introduced. The token is saved locally in AsolDB and remotely through:

```text
POST /api/notifications/device-token
DELETE /api/notifications/device-token
```

When a real Web Push, FCM, or APNs token is available, the platform adapter should pass the real token into the same registration flow. Server credentials remain outside the client.

Logout must unregister the current device before client storage is cleared. The
logout flow removes locally known device tokens from the server and also asks
the active Web Push subscription, when supported, to unsubscribe and delete its
server token by device id. This applies to Web, Android, and future iOS tokens
stored through the same device-token service.

## Multi-User Sending

The backend has an API for preparing delivery to one or many users:

```text
POST /api/notifications/send
```

Input accepts `uids: string[]` plus either `templateId` or custom `title`/`body`, with a stable `dedupeKey`. The service resolves registered tokens per user and returns per-user delivery readiness:

- `queued`: user has one or more enabled tokens.
- `no_tokens`: user has no enabled device token yet.

The current implementation prepares delivery and routes tokens through the provider registry. Providers currently queue through safe placeholders until real server credentials and transports are added.

## Notification Provider Interface

External push providers are isolated behind a server-only interface:

```text
Notification Provider Interface
            |
   +--------+---------+
   |        |         |
  FCM     APNs    Web Push
```

Files:

```text
src/features/notifications/services/providers/
├── notification-provider.interface.ts
├── notification-provider-registry.server.ts
├── fcm-notification-provider.server.ts
├── apns-notification-provider.server.ts
├── web-push-notification-provider.server.ts
└── noop-notification-provider.server.ts
```

Rules:

- UI and business modules never import provider implementations.
- `NotificationSendService` resolves registered tokens by provider key.
- `NotificationProviderRegistry` chooses the correct provider.
- Unknown providers use `NoopNotificationProvider`.
- FCM, APNs, and Web Push transports load credentials only from server-side environment configuration; unconfigured transports return an explicit failed result.
- Real provider credentials must be loaded only from server configuration.

## Push Flow

Push is intentionally behind interfaces:

- `CapacitorPushService`
- `CapacitorPermissionService`
- `CapacitorLocalNotificationService`
- `CapacitorBadgeService`
- `CapacitorPlatformService`
- `CapacitorAppStateService`

Future push providers must plug into these services or server-side APIs. Firebase or APNs server credentials must remain server-side only.

## Application States

### Foreground

The app saves the notification to AsolDB, updates the badge, emits center refresh events, and can display a browser notification when permission is granted. Badge refresh counts only unread notifications that include the `badge` target.

### Background

The operating system should display native push notifications. When the app becomes active, Android delivered notifications can be imported into the local center. Imports skip notifications already remembered in `user:<uid>:dismissed`.

### Terminated

No cloud persistence is used for local notification center state. Native notification centers keep received notifications while the app is terminated. Android startup import reads delivered tray notifications through the Capacitor adapter, skips empty `ASOL` placeholders, and ignores locally dismissed notification identities.

## Offline Queue

`notificationOfflineQueue` stores operations that cannot be synchronized while offline. The current implementation clears queued local operations once connectivity returns. Future server delivery receipts can reuse the same queue.

## Analytics

Lifecycle events are stored in `notificationAnalytics`:

- `sent`
- `delivered`
- `received`
- `displayed`
- `opened`
- `clicked`
- `dismissed`
- `failed`

Current UI records sent, displayed, opened, and dismissed.

## Deduplication

`AsolNotificationRepository.save()` checks the user's existing notifications by `dedupeKey`. If a duplicate exists, it returns the existing notification and does not store a second copy. It also checks `user:<uid>:dismissed`; if the incoming notification's `id` or `dedupeKey` was dismissed before, the item is ignored instead of being restored.

Recommended dedupe key format:

```text
<module>.<event>:<entityId>:<recipientRole>:<recipientUid>
```

Example:

```text
orders.created:ord_123:buyer:usr_1
```

## Grouping

Templates can define `groupKey`. Examples:

- `orders`
- `shipments`
- `returns`
- `chat`
- `offers`

The current notification center displays individual cards. Future UI can collapse cards by `groupKey`.

## Sound Support

Supported sound values:

- `default`
- `silent`
- `urgent`

Browser support is limited; native platform plugins can map these values to native channel sounds later.

## How To Add A Template

1. Add the same template ID to both JSON files.
2. Keep the same variables in Arabic and English.
3. Use valid category, priority, channels, targets, and sound values.
4. Add a test when the template is used by a new business flow.

## How To Add A Notification Type

1. Extend `NotificationTypes` or `NotificationCategories` in `domain/enums.ts`.
2. Add templates if the type is user-facing.
3. Add UI filters only if the category needs a dedicated view.

## How To Add An Event Mapping

1. Add the mapping in `EventNotificationMapper`.
2. Add templates for Arabic and English.
3. Publish from the business module through `notificationBus.publishEvent`.
4. Use a stable `dedupeKey`.

## How To Add A Channel

1. Add the channel to `NotificationChannels`.
2. Add routing behavior in `NotificationRouter` if needed.
3. Add infrastructure support behind a service.
4. Never call a provider SDK directly from business UI.

## How To Add A Target

1. Add the target to `NotificationTargets`.
2. Update templates that should appear there.
3. Add presentation code for that target if needed.

## How To Add Platform Integration

1. Add or extend a service under `infrastructure/capacitor`.
2. Keep platform APIs out of domain and business modules.
3. Store only safe local token data in AsolDB.
4. Keep provider secrets on the server.

## How To Add A Push Provider

1. Implement `NotificationProvider`.
2. Register it in `NotificationProviderRegistry`.
3. Store its provider key in `user_notification_tokens.provider`.
4. Load credentials from server-only configuration.
5. Return delivery results without leaking provider secrets or raw credential errors.

## Future Work

- Connect the real APNs transport inside the existing provider adapter.
- Import native notification-center entries on mobile startup.
- Add grouped notification views by `groupKey`.
- Add notification settings UI for channel and target preferences.
- Add server-side delivery receipts when a cloud push provider is selected.
- Add popup host UI for foreground in-app toast notifications.
- Expand order module publishing so every persisted order state transition emits recipient-specific events.
- Add admin analytics export for notification lifecycle events.

## Provider Layer Update

The notification module now has an explicit provider abstraction for external push delivery. The module must never call FCM, APNs, or Web Push directly from UI, hooks, client services, `NotificationBus`, or business modules.

Provider files:

```text
src/features/notifications/services/providers/
|-- notification-provider.interface.ts
|-- notification-provider-registry.server.ts
|-- fcm-notification-provider.server.ts
|-- apns-notification-provider.server.ts
|-- web-push-notification-provider.server.ts
`-- noop-notification-provider.server.ts
```

Provider flow:

```text
POST /api/notifications/send
  -> NotificationSendService
  -> ListNotificationTokensQuery
  -> UserNotificationTokenRepository
  -> group tokens by user_notification_tokens.provider
  -> NotificationProviderRegistry
  -> NotificationProvider.send()
```

Provider responsibilities:

| File | Responsibility |
|------|----------------|
| `notification-provider.interface.ts` | Defines the provider contract and send payload/result shapes. |
| `notification-provider-registry.server.ts` | Chooses the provider by token `provider` key. |
| `fcm-notification-provider.server.ts` | Server-side adapter location for Firebase Cloud Messaging. |
| `apns-notification-provider.server.ts` | Server-side adapter location for Apple Push Notification service. |
| `web-push-notification-provider.server.ts` | Server-side adapter location for browser Web Push. |
| `noop-notification-provider.server.ts` | Safe fallback for unknown or not-yet-configured providers. |

Current provider behavior:

- FCM uses Firebase Admin on the server and returns real per-batch delivery results.
- Invalid or unregistered FCM tokens are disabled after Firebase rejects them.
- APNs uses the HTTP/2 token provider when Apple credentials are configured and returns `apnsNotConfigured` otherwise.
- Web Push uses the configured VAPID transport.
- No provider credentials or private keys are stored in client code.
- Real provider credentials must be added through server-only configuration.

Multi-user send response example:

```json
{
  "requested": 2,
  "results": [
    {
      "uid": "usr_1",
      "tokenCount": 1,
      "status": "queued",
      "providers": [
        {
          "provider": "web_push",
          "tokenCount": 1,
          "status": "queued"
        }
      ]
    },
    {
      "uid": "usr_2",
      "tokenCount": 0,
      "status": "no_tokens"
    }
  ]
}
```

Rules for adding a real push transport:

1. Implement or extend a `NotificationProvider`.
2. Register it in `NotificationProviderRegistry`.
3. Store its provider key in `user_notification_tokens.provider`.
4. Load credentials from server-only configuration.
5. Keep provider SDK imports out of UI, hooks, client services, and business modules.
6. Do not log raw tokens, private keys, or provider credential errors.
7. Add a focused test under `src/features/notifications/tests`.
8. Run `npm run typecheck`, `npm run architecture:check`, `npm test`, and `npm run build`.

## Browser Web Push And VAPID

Browser push notifications use Web Push with VAPID keys. This is separate from FCM and APNs.

Runtime pages:

- User device settings: `/settings`
- Super-admin VAPID management: `/super-admin/vapid`

Server APIs:

```text
GET  /api/notifications/web-push/public-key
GET  /api/notifications/web-push/vapid?uid=...&phone=...
POST /api/notifications/web-push/vapid
PUT  /api/notifications/web-push/vapid
```

The public-key API is available to browser clients so they can create a `PushSubscription`. Admin APIs require the super-admin identity.

Database table:

```text
notification_vapid_settings
```

Columns:

- `id`
- `public_key`
- `private_key`
- `subject`
- `enabled`
- `created_at`
- `updated_at`

Security rules:

- The browser receives only `public_key`.
- `private_key` stays in the users database and is read only by server code.
- The super-admin UI shows whether a private key exists, but never displays the private key.
- Web Push subscriptions are stored in `user_notification_tokens` with `provider = web_push`.
- The stored web push token is the serialized `PushSubscription` JSON.

Browser subscription flow:

```text
/settings
  -> request Notification permission
  -> register /asol-push-sw.js
  -> PushManager.subscribe(public VAPID key)
  -> POST /api/notifications/device-token
  -> user_notification_tokens(provider = web_push)
```

Super-admin VAPID flow:

```text
/super-admin/vapid
  -> generate VAPID public/private key pair
  -> save subject and enabled state
  -> private key remains server-side
```

Delivery flow:

```text
NotificationSendService
  -> token provider = web_push
  -> WebPushNotificationProvider
  -> VAPID settings
  -> web-push transport
  -> browser service worker
```

Service worker:

```text
public/asol-push-sw.js
```

The service worker displays push notifications, stores a local copy in the
AsolDB notification center for the target `uid`, refreshes the local badge
state, notifies open app windows to reload `/notifications`, and opens the
notification route or provided deep link when the user clicks the notification.
Before storing, it reads `user:<uid>:dismissed` and skips any notification whose
`id` or `dedupeKey` was already deleted by the user.

The service worker ignores invalid push payloads that do not include a target
`uid` or any meaningful notification identity/content. This prevents empty
browser pushes from appearing as blank `ASOL` notifications.

## Super Admin Broadcast Notifications

The super-admin broadcast page sends one notification message to many users through the same notification provider layer used by normal system notifications.

Runtime page:

- Super-admin broadcast page: `/super-admin/notifications-broadcast`

Server APIs:

```text
GET  /api/notifications/broadcast/recipients?uid=...&phone=...
POST /api/notifications/broadcast/send
```

Recipient source:

- The recipients API reads from the users database.
- It joins `users` with `user_notification_tokens`.
- It returns only users with at least one enabled, non-deleted notification token.
- Deleted users and deleted tokens are ignored.
- Raw token values are never returned to the browser.
- Phone and email are masked in the admin UI.

Broadcast behavior:

- The super admin can refresh the recipient list.
- The super admin can select specific users or send to all eligible users.
- The UI asks for confirmation before sending.
- The UI blocks duplicate in-flight send clicks.
- A broadcast requires both a title and body.
- Delivery is delegated to `NotificationSendService`.
- `NotificationSendService` routes each token to the correct registered `NotificationProvider`, such as Web Push.
- The broadcast metadata sets `source = super_admin_broadcast` and uses `/notifications` as the default deep link.
- Broadcast `dedupeKey` is stable for the same title, body, and audience. Sending the exact same message to the same audience will not create duplicate notification-center entries.

Security rules:

- The recipient and send APIs require the super-admin identity.
- The client does not query the database directly.
- The database query and token access stay in server-only notification repositories.
- The broadcast page shows token counts, platforms, and provider names, but never exposes token secrets.

Future improvements:

- Add audience filters by platform, last activity date, role, or profile specialty.
- Add scheduling and retry dashboards.
- Add a delivery analytics page grouped by provider and platform.
- Add templates for repeated operational announcements.
