# ASOL Notification System

> Specialty-based buyer/provider conversations are documented in [`specialty-notification-chat.md`](specialty-notification-chat.md). They use notifications as their sole transport and keep message content only in the local notification center.

Notification bodies and notification-center rows have no SQLite/Turso table. Device tokens, push-provider credentials, and per-user delivery preferences are server metadata only; actual notification cards, lifecycle analytics, badges, receipts, and conversation messages are persisted exclusively in AsolDB IndexedDB on the current client.

> Server-side notification state and push fan-out live on their own Turso and
> Vercel accounts. See [Notifications Database Token Storage](#notifications-database-token-storage)
> and [Where The Fan-Out Runs](#where-the-fan-out-runs).

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
- Client business modules publish through `NotificationBus`; they do not talk directly to push providers.
- Server business flows (orders, shipping quotes, unified delivery, specialty chat) issue a signed grant with a `templateId`; the notifications service resolves the text per recipient language when it delivers.
- Push text follows the device's own language; each token stores the locale it was registered with.
- Event-to-template mapping exists for orders, shipments, returns, chat, payments, offers, and system notices. Only `orders.created` is published today, from the cart page on the buyer's own device.
- Deduplication uses `dedupeKey`; duplicate entries are not stored again.
- Dismissed notifications store their `id` and `dedupeKey` locally so Web Push or Android tray imports do not restore items the user already deleted.
- Notification lifecycle analytics are stored locally.
- Optional Capacitor-facing services are isolated behind infrastructure services.
- Push provider credentials are not present in the client.
- Device tokens are stored in the dedicated notifications database in `user_notification_tokens`, locally in `notifications.db` and in its own Turso account after schema sync.
- Server APIs support registering/removing a device token and delivering notifications to one user or many users.
- Push delivery uses a server-side provider interface and registry instead of direct coupling to FCM, APNs, or Web Push.
- FCM (Android, and Apple once the Firebase iOS SDK is installed) and Web Push are live transports. Direct APNs is an opt-in fallback that stays unconfigured by default.

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

The module uses the existing `AsolDB` IndexedDB database. The database version is `9`.

Dedicated stores:

- `notifications`
- `notificationDeviceTokens`
- `notificationSettings`
- `notificationBadges`
- `notificationAnalytics`
- `notificationOfflineQueue`

Templates are intentionally excluded from AsolDB. They are static versioned files inside the app bundle.

Every store is keyed per user and bounded:

| Store | Key | Bound |
|-------|-----|-------|
| `notifications` | `user:<uid>:list` | newest 250 notifications |
| `notificationSettings` | `user:<uid>` | one settings record |
| `notificationSettings` | `user:<uid>:dismissed` | newest 500 dismissed identities |
| `notificationBadges` | `user:<uid>` | one badge record |
| `notificationDeviceTokens` | `user:<uid>:tokens` | unbounded, one entry per device |
| `notificationAnalytics` | `user:<uid>:analytics` | newest 500 lifecycle events |
| `notificationOfflineQueue` | `user:<uid>:queue` | cleared when connectivity returns |

The `notificationSettings` store also contains the bounded
`user:<uid>:dismissed` list. The list stores notification `id` and `dedupeKey`
values for deleted center items and is used to reject later imports of the same
notification from Web Push service-worker payloads or Android delivered
notifications.

The repository also treats an empty `ASOL` card — title `ASOL`, no body, no
route, no template, no event — as a placeholder. Placeholders are never stored,
are stripped from existing lists on read, and their identities are added to the
dismissed list.

## Notifications Database Token Storage

Push/device tokens that must be available to the backend are stored in the
**notifications database**, not in the local notification center stores and no
longer in the users database.

That database lives in its own Turso account (`hesham102`) behind
`notificationsDataSource` and `TURSO_NOTIFICATIONS_DATABASE_URL` /
`TURSO_NOTIFICATIONS_AUTH_TOKEN`. Push is the burstiest workload in the system —
one provider request per token — so isolating it means it can never consume the
quota that serves logins, products, or orders.

The consequence to remember: `uid` links these tables to `users`, but the two
databases are on different accounts and **cannot be joined**. Any query needing
both resolves them separately and merges in memory. See
[`../01-architecture/data-layers/11-current-databases.md`](../01-architecture/data-layers/11-current-databases.md).

Table:

```text
user_notification_tokens
```

Columns:

- `id`: derived as `ntok_<uid>_<platform>_<deviceId>` with unsupported characters replaced
- `uid`
- `platform`: `web`, `android`, or `ios`
- `provider`: `web_push`, `fcm`, or `apns` — enforced by `NotificationTokenService.register`
- `device_id`
- `token`: the FCM/APNs registration token, or the serialized `PushSubscription` JSON for Web Push
- `locale`: `ar` or `en`, the language this device reads in
- `enabled`
- `specialty_requests_enabled`: per-device mirror of the specialty-chat opt-out
- `last_seen_at`
- `created_at`
- `updated_at`
- `deleted_at`

Indexes:

- `user_notification_tokens_uid_idx`
- `user_notification_tokens_uid_device_unique` on (`uid`, `device_id`, `platform`)
- `user_notification_tokens_token_unique` on (`token`)

This table supports multiple devices per user and allows disabling one device without changing the user account.

The authoritative specialty-chat opt-out lives in a second table:

```text
user_notification_preferences
```

Columns: `uid` (primary key), `specialty_requests_enabled`, `updated_at`.
Reads use this table; writes update it and mirror the value onto every token row
of the same user.

Removing a token is a soft delete: `enabled` becomes false and `deleted_at` is
set. Rows are never physically deleted.

Because a soft-deleted row keeps both its primary key and its place in the
`(uid, device_id, platform)` unique index, `upsert` matches deleted rows too and
revives them. A device that turns notifications off and on again reuses its
original row and keeps its `specialty_requests_enabled` preference.

If the same token value already exists on another row — a reinstall that
produced a new device id, or a second account on the same handset — that older
row is retired with a `revoked:<id>:<timestamp>` tombstone token. This frees the
`token` unique index without deleting the audit row.

## Notification Lifecycle

1. A module publishes a custom notification, template notification, or business event through `NotificationBus`.
2. `EventNotificationMapper` converts business events into template IDs.
3. `NotificationBuilder` resolves the template, variables, deep link, priority, channels, targets, group key, and sound.
4. `NotificationSender` stores the notification in AsolDB, applies routing, updates badge count, emits UI refresh events, and records analytics.
5. The notification center reloads through `useNotifications`.
6. Opening, marking all as read, or dismissing a notification updates badge state and emits a UI refresh event so `/notifications` and the bottom bar stay in sync.
7. Dismissing a notification also remembers its `id` and `dedupeKey`; repeated Web Push or Android tray imports with the same identity are ignored.

## Notification Bus

`NotificationBus` is the only entry point for client business modules. It is a
local-first publisher: it builds the notification, stores it in AsolDB, and
refreshes the badge on the current device. It does not send push.

Supported publish methods:

- `publishTemplate(input)` — build from a template and store locally.
- `publishCustom(input)` — build from caller-supplied title/body and store locally.
- `publishEvent(event, locale)` — map a business event to a template, then publish locally. Returns `null` when the event has no mapping.

Every notification must include a stable `dedupeKey`. Optional `notificationId` can be supplied by the caller when an upstream event already has a stable ID.

Current consumers:

| Caller | Method | Template |
|--------|--------|----------|
| `src/components/cart/CartPageContent.tsx` | `publishEvent` | `orders.created` |

Server-side flows do not go through the bus. The main app serves no send route at
all — fan-out lives on the
[notifications service](notifications-service-module.md) — so
`NotificationApiService` deliberately exposes no send method.
`src/app/api/orders/**` and
`src/features/specialty-chat/services/specialty-chat-service.server.ts` issue
signed grants through `NotificationGrantCollector` and return them in the
response body; the [browser bridge](notification-bridge-module.md) delivers them.

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

Only `orders.created` is published today. The remaining mappings are defined and
tested but have no caller yet.

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
    "channels": ["in_app", "web_push", "android_push", "ios_push"],
    "targets": ["center", "badge", "popup", "orders", "buyer_dashboard"],
    "deepLink": {
      "href": "/orders/details?orderId={{orderId}}",
      "label": "View order"
    },
    "groupKey": "orders",
    "sound": "default"
  }
}
```

The template loader validates category, priority, channels, targets, and sound at
runtime. Both locales are parsed and validated when a `NotificationTemplateLoader`
is constructed — not lazily per template — so an invalid template throws as soon
as the builder is created rather than at send time.

Shipped template IDs:

| Group | IDs |
|-------|-----|
| Orders | `order.created`, `order.updated`, `order.sellerAccepted`, `order.sellerRejected`, `shipment.updated`, `return.requested` |
| Shipping quotes | `shipping.quoteProposed`, `shipping.quoteAccepted`, `shipping.quoteRejected` |
| Unified delivery | `delivery.planInvitation`, `delivery.quoteProposed`, `delivery.quoteAccepted`, `delivery.quoteRejected`, `delivery.separateSelected` |
| Specialty chat | `specialty.request`, `specialty.replyFromProvider`, `specialty.messageFromBuyer` |
| Other | `message.new`, `payment.received`, `offer.received`, `system.info` |

Specialty-chat templates carry the sender's own text in `{{message}}`. Only the
title and the deep-link label are translated; message content is never
rewritten.

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

`popup` currently emits the `asol:notifications:popup` window event and asks the
Capacitor local-notification service to display the notification. No popup host
component listens to that event yet.

The `/notifications` page filters by `all`, `unread`, and every category:
`orders`, `chat`, `offers`, `payment`, and `system`. Shipping-quote and
delivery-plan notifications are published under `offers`.

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

`DeviceTokenService` owns native token registration, listing, and removal.
`WebPushBrowserService` owns the browser subscription path. Both persist through
the same server APIs:

```text
POST   /api/notifications/device-token
DELETE /api/notifications/device-token?uid=&phone=&deviceId=&tokenId=
```

Real tokens are registered, not placeholders:

| Platform | Source | Stored `provider` |
|----------|--------|-------------------|
| `web` | `PushSubscription` JSON from `PushManager.subscribe` | `web_push` |
| `android` | Capacitor Push Notifications registration token | `fcm` |
| `ios` | Capacitor registration token, classified by shape in `domain/push-token-kind.ts` | `apns` for a 64-hex Apple token, `fcm` for a Firebase token |

Registration validation on the server (`NotificationTokenService.register`):

- The supplied `uid` must exist and its stored phone must match `phone`.
- `deviceId` must be non-empty and at most 200 characters.
- `token` must be between 20 and 8192 characters.
- `platform` must be `web`, `android`, or `ios`.
- The platform/provider pair must be `web`+`web_push`, `android`+`fcm`, `ios`+`apns`, or `ios`+`fcm`. Apple accepts both because the token kind depends on whether the Firebase Messaging iOS SDK is installed, and the registry routes each kind to its own transport.
- `locale` is narrowed to `ar` or `en`, defaulting to `ar`.

Server credentials remain outside the client.

Unregistering removes locally known device tokens from the server and also asks
the active Web Push subscription, when supported, to unsubscribe and delete its
server token by device id.

Every path that ends a session unregisters first:

| Path | Notes |
|------|-------|
| Disabling notifications in `/settings` | Web Push and native both. |
| Clear application data in `/settings` | Runs before `clearAllClientStorage`. |
| Sign out, any platform | `useLogout` unregisters before clearing the session. Failures are swallowed so sign-out itself never blocks. |
| Switching accounts on a native device | `NativePushController` also unregisters the previous uid when it sees the change. |

Removing the token is what stops delivery: without it the browser or handset
keeps receiving the previous user's push messages, and the service worker keeps
writing them into AsolDB under that uid.

## Device Language

Push text is built in the language of the receiving device.

- Each token row stores a `locale` (`ar` or `en`), sent by the client at registration time from the stored app preferences.
- `NotificationSendService` groups a user's tokens by transport **and** language, then builds one payload per group.
- Tokens registered before this column existed default to `ar`, and the caller's `locale` is used only when a token has none.
- Changing the language in the app re-registers the existing token. `WebPushController` listens for the document-locale event and calls `DeviceTokenService.refreshLocale`, which never prompts for permission and does nothing when no subscription exists.

Values that must be formatted per language — money, category names — cannot live
inside a template. Pass them through `variablesByLocale`, which is merged over
`variables` for each group:

```ts
notificationGrants.issue({
  uids,
  templateId: "shipping.quoteProposed",
  dedupeKey: `shipping-quote:${quoteId}:pending_buyer`,
  variables: { orderId },
  variablesByLocale: moneyVariablesByLocale("amount", amountMinor),
});
```

`routeByLocale` does the same for a deep-link label when the template's own
link is not enough.

## Multi-User Sending

Delivery to one or many users is served by the
[notifications service](notifications-service-module.md), on its own Vercel
account:

```text
POST https://<notifications-service>/api/notifications/send
Content-Type: application/json

{ "grants": ["<signed grant>", "…"] }
```

The browser is the caller and the grant is the only authority. There is no
bearer token: a shared bearer would let anything holding it send anything to
anyone, while a grant authorises exactly one pre-approved send and expires in
five minutes. No cookies or credentials are sent, so a permissive CORS origin
cannot be used to ride on someone's session.

The main app does not serve this path at all. Its routes — orders, specialty
chat, super-admin broadcast — issue grants through `NotificationGrantCollector`
and return them; they never address the service.

Each grant is verified independently, so one expired entry fails without losing
the rest. The response reports `accepted`, `rejected`, and a per-grant result.

Input accepts `uids: string[]` plus either `templateId` or custom `title`/`body`,
with a stable `dedupeKey`. Duplicate and empty uids are removed. The service
resolves enabled tokens per user, groups them by `provider`, and calls the
matching provider once per group.

Per-user status:

- `no_tokens`: user has no enabled device token.
- `sent`: every provider group reported `sent`.
- `queued`: at least one group reported `queued` and none failed (Web Push reports `queued`, not `sent`).
- `partial`: at least one group partially or fully failed while another succeeded.
- `failed`: every provider group failed.

Tokens reported invalid by a provider (`UNREGISTERED` or `INVALID_ARGUMENT` on
FCM, HTTP 400/410 on APNs) are soft-deleted in the same request.

## Where The Fan-Out Runs

**The two backends never call each other.** The main app has no code path to the
notifications service and the service has no code path back. The browser is the
only thing that touches both.

```text
1. browser ──► main app          "accept this order"
2.         ◄── order + signed notification grant(s)
3. browser ──► notifications service   the grant
4.                                     verify signature, fan out to devices
```

A **grant** is the whole send — recipients, template, variables, metadata —
signed by the main app with `ASOL_NOTIFICATION_GRANT_SECRET` and valid for five
minutes. Signing the entire payload rather than just the recipients is what
makes the browser a courier instead of a participant: adding a uid, swapping the
template, or rewriting the body invalidates the signature.

Only the main app can decide *who* should be notified, because only it holds the
users and orders databases. Only the service can *deliver*, because only it holds
the Firebase and APNs credentials. The grant is that decision, in transit.

Fan-out is one provider request per token, up to 25 in flight. On a serverless
platform billed by wall clock that is the expensive part of a notification, and
it is billed to the notifications account.

Routes issue grants through `NotificationGrantCollector` and return them in the
response body under `notificationGrants`. `AsolApiClient.parseResponse` hands
every response to the [browser bridge](notification-bridge-module.md), so no
call site has to remember to forward anything.

### What this costs

Delivery is **best effort**, and that is a deliberate trade, not an oversight.
The browser must still be alive to carry the grant. A seller who accepts an order
and closes the tab immediately leaves the buyer unnotified, and there is no
server-side retry, because the server no longer knows the service exists.

The API response reports what was **granted**, never what a provider accepted —
`grantedUsers`, and `status: "granted"`. Provider acceptance is not knowable on
the main app any more, so it is not claimed.

Device-token registration, VAPID management, and broadcast recipient listing stay
on the main app: they need the users database for identity checks and masked
contact details. The notifications account never receives users, product, or
shard credentials.

The notifications deployment is not connected to GitHub. It updates only when
`npm run notifications:deploy` is run; a push to the repository redeploys the
main app alone.

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
├── fcm-http-v1.server.ts
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

The foreground path is wired by `NativePushController`, mounted once in
`src/app/layout.tsx`. It runs on Android and iOS — the gate is `isNativePush()` —
and owns the received/tapped handlers, the tray import, and unregistering the
previous uid when the account changes. `WebPushController` is mounted next to it
and forwards service-worker messages to the window, plus re-registers the token
after a language switch on every platform.

### Background

The operating system should display native push notifications. When the app becomes active, Android delivered notifications can be imported into the local center. Imports skip notifications already remembered in `user:<uid>:dismissed`.

### Terminated

No cloud persistence is used for local notification center state. Native notification centers keep received notifications while the app is terminated. Android startup import reads delivered tray notifications through the Capacitor adapter, skips empty `ASOL` placeholders, and ignores locally dismissed notification identities.

## Offline Queue

`notificationOfflineQueue` holds operations that could not reach the server.

Specialty-chat receipts are the queued kind today. They are emitted on the
user's behalf when a card is delivered or opened, so a failure has no manual
retry — the sender would wait forever on a receipt that never arrives.

- `NotificationSyncService.enqueue` records the operation, keyed so the same receipt is never queued twice.
- `sync(uid, handlers)` replays it when the device is online. The caller supplies the handler because replay needs the session token, which the service does not own.
- An operation is dropped after five failed attempts, and an operation whose kind has no handler in the current runtime is dropped rather than kept forever.
- `useNotifications` flushes the queue on mount and on the browser `online` event.

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

Recorded today: `sent` and `displayed` on local publish, `received` and
`displayed` on foreground/native receive, `opened` on mark-as-read, and
`dismissed` on delete. `delivered`, `clicked`, and `failed` are defined but never
written. Analytics are local-only and are never uploaded.

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

Templates can define `groupKey`. Values used by the shipped templates:

- `orders`
- `shipments`
- `returns`
- `chat`
- `payments`
- `offers`
- `system`

`groupKey` also maps to the Android notification group and the Apple
`thread-id`. The current notification center displays individual cards. Future
UI can collapse cards by `groupKey`.

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

## Remaining Limitations

These are deliberate boundaries rather than defects.

| Limitation | Effect |
|------------|--------|
| Notification-center content is local-only. | History does not follow the user across devices and is lost when application data is cleared. |
| The offline queue replays receipts only. | Other operations still fail silently while offline; nothing else is queued yet. |
| Apple devices cannot use Firebase until the Xcode SDK step lands. | Raw APNs tokens require the optional `APNS_*` transport; see [`../07-mobile-and-release/capacitor/ios-push-notifications.md`](../07-mobile-and-release/capacitor/ios-push-notifications.md). |
| Analytics are never uploaded. | `delivered`, `clicked`, and `failed` remain unwritten, and there is no admin view. |

## Future Work

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
|-- fcm-http-v1.server.ts
|-- apns-notification-provider.server.ts
|-- web-push-notification-provider.server.ts
`-- noop-notification-provider.server.ts
```

Provider flow:

```text
POST /api/notifications/send        (on the notifications service)
  -> NotificationSendService.sendToUsersLocally
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
| `fcm-notification-provider.server.ts` | Firebase Cloud Messaging over the HTTP v1 endpoint, including the Android channel/sound block and the Apple `apns` block. |
| `fcm-http-v1.server.ts` | OAuth token exchange and the raw HTTP v1 send call used by the FCM provider. |
| `apns-notification-provider.server.ts` | Optional direct Apple Push Notification service transport over HTTP/2. |
| `web-push-notification-provider.server.ts` | Browser Web Push over the stored VAPID key pair. |
| `noop-notification-provider.server.ts` | Safe fallback for unknown or not-yet-configured providers. |

Current provider behavior:

- FCM uses the FCM HTTP v1 endpoint with OAuth service-account authentication and returns real per-token delivery results. It sends one message per token, at most 25 requests in flight.
- Invalid or unregistered FCM tokens are soft-deleted after Firebase rejects them.
- When Firebase credentials are missing, FCM returns `failed` with `firebaseAdminNotConfigured` and deliberately keeps the tokens — this is a server misconfiguration, not a dead device.
- APNs uses a direct HTTP/2 connection with an ES256 JWT when `APNS_TEAM_ID`, `APNS_KEY_ID`, and `APNS_PRIVATE_KEY` are configured. Unconfigured, it returns `failed` with `appleTokenNotDeliverable` and keeps the tokens.
- Web Push uses the configured VAPID transport, and returns `queued` unless every send is rejected.
- No provider credentials or private keys are stored in client code.
- Real provider credentials must be added through server-only configuration.

Multi-user send response example:

```json
{
  "requested": 3,
  "results": [
    {
      "uid": "usr_1",
      "tokenCount": 1,
      "status": "queued",
      "providers": [
        { "provider": "web_push", "tokenCount": 1, "status": "queued" }
      ]
    },
    {
      "uid": "usr_2",
      "tokenCount": 2,
      "status": "partial",
      "providers": [
        {
          "provider": "fcm",
          "tokenCount": 2,
          "status": "partial",
          "successCount": 1,
          "failureCount": 1,
          "invalidTokenIds": ["ntok_usr_2_android_android_9f2c"],
          "message": "1 FCM deliveries failed."
        }
      ]
    },
    {
      "uid": "usr_3",
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
- `private_key` stays in the notifications database and is read only by server code.
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

Stored service-worker copies always use `channels: ["in_app", "web_push"]` and
`targets: ["center", "badge"]`, regardless of the template that produced them.
The badge value it writes applies the same rule as `BadgeService`: unread items
that carry the `badge` target.

Specialty-chat receipt pushes are handled before display: they update the
matching outgoing notification and never call `showNotification`.

The service worker duplicates the AsolDB name, version, and store list from
`src/modules/data-access/browser/asol-db`, because a static worker cannot import
the module. `notification-local-storage-contract.test.ts` compares the two and
fails the build when they drift — opening IndexedDB with a stale version there
throws and silently drops every browser push.

The worker source is `src/modules/data-access/browser/workers/asol-push-sw.js`.
`public/asol-push-sw.js` is generated from it by `npm run data-access:sync-public`,
and the architecture check rejects a hand-edited public copy.

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

- The recipients API reads enabled tokens from the notifications database, then looks up those uids in the users database and merges the two in memory.
- It cannot join them: they are separate databases on separate accounts. Tokens are read first because that is the narrower side.
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
- The broadcast metadata sets `source = super_admin_broadcast`, carries the caller's `requestId`, and uses `/notifications` as the default deep link.
- Broadcast `dedupeKey` is `broadcast:<sha256(title, body, audience)>` truncated to 24 characters. It is stable for the same title, body, and audience, so resending the identical message to the identical audience will not create duplicate notification-center entries.
- Selected uids are intersected with the eligible recipient list before sending; unknown or ineligible uids are dropped rather than rejected.
- A broadcast is push-only on the server. The notification-center row is created on the recipient's device by the Web Push service worker or by the Android tray import, so a user with no reachable device gets no local card.
- The super-admin identity is supplied in the request body and verified by `NotificationBroadcastService` for both the recipients and send calls.

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
