# ASOL Notification System

> Specialty-based buyer/provider conversations are documented in [`specialty-notification-chat.md`](specialty-notification-chat.md). They use notifications as their sole transport and keep message content only in the local notification center.

Notification bodies and notification-center rows have no SQLite/Turso table. Device tokens, push-provider credentials, and per-user delivery preferences are server metadata only; the permanent application copy of notification cards, lifecycle analytics, badges, receipts, and conversation messages is exclusively in AsolDB IndexedDB on the current client.

> **The one on-device exception, and it is not cloud storage.** While
> JavaScript and IndexedDB cannot run at all — the app backgrounded with its
> process reclaimed, swiped away, or not yet started — Android temporarily
> retains the inbound payload in an *application-owned, device-local, private*
> inbox, encrypted with AndroidKeyStore when available and otherwise kept in the
> same app-private file. It is a handoff buffer, not a history: every record is
> uid-scoped, bounded by count and age, never leaves the device, and is deleted
> the moment the notification is confirmed present in IndexedDB. See
> [The Android Device-Local Notification Inbox](#the-android-device-local-notification-inbox).

> Server-side notification state and push fan-out live on their own Turso and
> Vercel accounts. See [Notifications Database Token Storage](#notifications-database-token-storage)
> and [Where The Fan-Out Runs](#where-the-fan-out-runs).

> Android production setup and operational checks are documented in
> [`../07-mobile-and-release/capacitor/android-push-notifications.md`](../07-mobile-and-release/capacitor/android-push-notifications.md).

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
- FCM (Android, and Apple with the Firebase Messaging iOS SDK configured in Xcode SPM) and Web Push are live transports. Direct APNs is an opt-in fallback that stays unconfigured by default.
- Android delivery is application-owned: the payload is data-only, `AsolPushMessagingService` persists it to the app-private native inbox (AndroidKeyStore-encrypted when available) before displaying it, and the record is deleted only after IndexedDB has it. iOS/APNs and Web Push are unchanged.
- A notification tap opens `/notifications`; the business deep link stays on the stored notification and is followed when the card is opened.
- Store owners can compose a follower broadcast from their profile preview.
  The main app verifies the signed owner session and resolves the current
  follower audience, then the browser carries a signed grant to the isolated
  notifications service and reports the real per-recipient delivery outcome.

## Folder Structure

```text
src/features/notifications/
├── index.ts              entry point — behaviour (client/application)
├── ui.ts                 entry point — React components and hooks
├── server.ts             entry point — server use cases (server-only)
├── contracts.ts          entry point — types only
├── service-runtime.ts    entry point — the notifications microservice
├── application/
├── config/
│   └── templates/
├── domain/
├── infrastructure/
│   ├── capacitor/
│   └── web-push/
├── presentation/
│   └── hooks/
├── public/               the facade, the command map, the extension port
├── shared/
└── tests/
    └── integration/
```

## Architecture

The module follows a layered structure:

- `domain`: entities, enums, defaults, validation, redaction, typed errors, the
  notification builder and template loader, and the inbound payload mapper.
  Depends on nothing but `config`.
- `application`: use cases — the bus, sender, receiver, router, sync, lifecycle,
  permissions, device tokens, analytics, badge.
- `infrastructure`: AsolDB persistence and the platform adapters
  (`capacitor/`, `web-push/`, the push-device store).
- `services`: outbound transports — the browser API client and the server-side
  provider implementations.
- `public`: the facade, the command union and result map, the extension port.
- `presentation`: the React page, hooks, the opt-in dialog, and the lifecycle
  controllers mounted in `src/app/layout.tsx`.
- `config`: notification templates in JSON.
- `shared`: small reusable helpers, including the concurrency primitives.
- `tests`: boundary, contract, and integration suites.

### Layer dependency matrix

Enforced by `packages/architecture-core/src/contracts/notification-contract.ts`. Read each row as
"may depend on":

| Layer | May import |
|-------|-----------|
| `config` | nothing |
| `domain` | `config` |
| `shared` | `domain`, `config` |
| `services` | `domain`, `shared`, `config` |
| `infrastructure` | `domain`, `shared`, `config`, `services` |
| `application` | `domain`, `shared`, `config`, `services`, `infrastructure` |
| `public` | everything except `presentation` |
| `presentation` | `domain`, `shared`, `config`, `application`, `public` |
| entry points | everything |

Two directions look wrong at a glance and are deliberate:

- **`infrastructure` → `services`.** `services/` is not "application services";
  it holds the module's *outbound transports*. The Web Push adapter calling the
  device-token API client is one adapter calling another — sideways, not upward.
- **`application` → `infrastructure`.** Use cases drive adapters. That is the
  normal direction; inversion would only be needed if the domain had to name an
  adapter, and it never does.

The direction that is genuinely forbidden, and the layer cycle this matrix was
written to close, is **`services` → `application`**. The server send service
needed the notification builder, so the builder moved to `domain`, where both
sides can reach it.

## Public Entry Points

Five, and each exists because it cannot be merged into another. Importing
anything else fails `npm run architecture:check` **and**
`npm run test:notifications`.

| Entry point | For | Why separate |
|---|---|---|
| `@/features/notifications` | client/application behaviour | Exports exactly **one** runtime object, `notifications`. |
| `@/features/notifications/ui` | React components and hooks | In the root barrel these would pull the presentation tree — and React — into every route that only wants a type. |
| `@/features/notifications/server` | route handlers, server services | Everything behind it imports `server-only`, which is a build error inside a client component. |
| `@/features/notifications/contracts` | data-access repositories | Types only. A repository reaching `server.ts` would drag the broadcast and users code into the microservice's import mirror. |
| `@/features/notifications/service-runtime` | `services/notifications` only | That deployment is built by walking imports, so its import surface *is* its file surface. Restricted to grant verification and fan-out. |

`services/notifications` may import **only** `service-runtime`. The architecture
guard checks both trees and rejects a src-only entry point used there.

### The client API

```ts
import { notifications } from "@/features/notifications";

await notifications.execute({ type: "markAllRead", payload: { uid } });
await notifications.markAllRead({ uid });      // the same use case
```

`execute` is the command form: one entry point that takes the whole operation as
data. The named methods are the same use cases spelled out. Both route through
the same facade, so there is one implementation of each behaviour.

An unknown command **fails closed** with `notifications/unknown-command`; it is
never ignored.

### Command and result map

| Command | Result |
|---------|--------|
| `initialize` | `void` |
| `registerDevice` | `DeviceToken \| null` |
| `enableDevice` | `void` |
| `unregisterDevice` | `void` |
| `refreshDeviceLocale` | `void` |
| `listDevices` | `DeviceToken[]` |
| `requestPermission` | `NotificationPermission \| "unsupported"` |
| `getPermissionState` | `NotificationPermissionState` |
| `openPermissionSettings` | `boolean` |
| `sendLocal` | `NotificationEntity` |
| `publishTemplate` | `NotificationEntity` |
| `publishCustom` | `NotificationEntity` |
| `publishEvent` | `NotificationEntity \| null` |
| `sendPush` | `BroadcastNotificationResult` |
| `listPushRecipients` | `BroadcastRecipientsResult` |
| `receive` | `NotificationReceiveOutcome` |
| `importDelivered` | `void` |
| `createChannels` | `void` |
| `synchronizeNotificationCenter` | `NotificationCenterSnapshot` |
| `list` | `NotificationEntity[]` |
| `getUnreadCount` | `number` |
| `markRead` / `markManyRead` / `markAllRead` | `void` |
| `dismiss` | `void` |
| `openNotification` | `OpenNotificationResult` |
| `patchMetadata` | `void` |
| `enqueueRetry` | `void` |
| `registerCenterExtension` | `() => void` |
| `executeTestScenario` | `NotificationTestResult` |
| `getDiagnostics` | `NotificationDiagnostics` |

The union and the result map are proved complete against each other at compile
time (`CommandResultMapIsComplete`, `CommandListIsComplete`), and each command is
routed by a mapped-type handler table, so a handler returning the wrong shape or
a command with no handler does not compile.

### The server API

```ts
import { notificationsServer } from "@/features/notifications/server";

const token = await notificationsServer.registerDeviceToken(body);
const grants = notificationsServer.createGrantIssuer(actorUid);
return apiSuccess(notificationsServer.attachGrants(body, grants.toArray()));
```

It exports **no service instance**. Commands: `registerDeviceToken`,
`removeDeviceToken`, `listBroadcastRecipients`, `sendBroadcast`,
`sendTestNotification`. `createGrantIssuer` returns the one stateful object,
because a route accumulates grants across branches before responding.

## Validation And Typed Errors

Every value entering the module is checked before it can reach persistence,
navigation, a native plugin, a provider, a log, or the screen. Two strictnesses,
and the difference is the whole design:

| | `assert*` | `sanitize*` |
|---|---|---|
| Used for | values a caller in this codebase supplied | anything from outside the process — a provider, a plugin, a service worker, an older record |
| On bad input | throws `NotificationError` | drops the field and keeps the notification |
| Why | a bug should be loud and fixed at the call site | one malformed key must not cost the user the message |

What is validated: command type and payload; uid, notification id, dedupe key,
device id, token, phone, locale; notification type, source, priority, category,
channels, targets, sound, status, sync state; timestamps (parseable and
plausible); title and body lengths; route safety; metadata shape, key count, key
length, value types and serialized size; retry-queue envelopes; extension
registration; permission and platform values.

### Route safety

A deep link may be navigated to only when it is a same-origin absolute path.
Rejected: `//host`, `https://…`, `javascript:`, `data:`, backslash variants
(`/\host`), encoded double slashes, and `..` traversal. A notification is
attacker-influenced input on every platform — anyone who can get a message
accepted chooses this string — so an unsafe route is dropped and the
notification is still stored.

### Error codes

`NotificationError` carries a stable `code` and a message that names *what* was
wrong, never *what the value was*.

`notifications/unknown-command`, `invalid-command-payload`, `missing-field`,
`invalid-field`, `unsupported-value`, `unsafe-route`, `invalid-metadata`,
`invalid-record`, `permission-denied`, `unsupported-platform`, `delivery-failed`.

### Device-token routes take untyped bodies

`NotificationTokenService.register` and `remove` read every text field through a
`trimmedText` coercion rather than calling `.trim()` on the declared type. A request
body is JSON the client controls, so a missing field is `undefined` at runtime no
matter what the TypeScript signature promises; dereferencing it threw a `TypeError`
that `mapServiceError` could only report as a 500, hiding a bad payload behind a
server fault and persisting it as a system issue. Coerced to an empty string, the
existing checks classify it: no identity is `forbidden` (403), and a blank device id
or token returns its own 400 code.

## Secret Redaction

`domain/notification-redaction.ts` is the module's only logger and its single
redaction point. It matches secrets two ways, because either alone misses real
cases:

1. **By key** — `sessionToken`, `authorization`, `vapid…`: the name says it is a
   secret whatever the value looks like.
2. **By value shape** — JWTs, `Bearer …`, 64-hex APNs tokens, serialized
   `PushSubscription`s, PEM blocks, FCM registration tokens. A provider can
   return these under any key, including one nobody has seen.

Embedded secrets are cut out of longer strings too, which is the case that
actually bites: a provider does not return a bare token, it returns
`FCM rejected {"authorization":"Bearer ya29…"}` and that sentence becomes an
error message.

Protected surfaces: diagnostics, console logging, typed errors, **persisted
notification metadata**, and the retry queue. `notificationLog` is the only
permitted caller of `console` inside the module; the architecture guard rejects
any other.

## Concurrency And Exactly-Once

Notification work is triggered by things that fire together and are outside the
application's control: a push arriving while the resume listener imports the
tray, two `visibilitychange` events in one tick, a service worker and a
foreground handler writing the same list.

Two primitives, in `shared/keyed-mutex.ts`, and they are not interchangeable:

- **`KeyedMutex` serializes.** Two different saves must both happen. Every
  read-modify-write against a stored list runs inside a per-user lock, because
  IndexedDB has no compare-and-swap and interleaved reads silently drop the
  write that finished first.
- **`SingleFlight` coalesces.** Two concurrent requests to import the tray are
  the same request; the second joins the first.

Where each applies:

| Operation | Protection |
|-----------|-----------|
| Notification list read/write, dismissal list, device tokens, analytics, retry queue | `KeyedMutex`, per user and per key space |
| Tray import | `SingleFlight` per user, inside the adapter |
| `initialize`, `registerDevice` | `SingleFlight` per user |
| `synchronizeNotificationCenter` | `SingleFlight` per user |
| Retry replay | `SingleFlight` per user; the queue is rewritten by identity so an entry enqueued during a replay survives |

**Acknowledgement follows persistence.** `receive` returns
`{ notification, stored, reason? }`, and `stored` is the acknowledgement signal.
The Android adapter presents a banner only when `stored` is true, which is what
makes "exactly one banner" true for a push Firebase delivers twice. A crash
between persistence and acknowledgement leaves the tray item to be re-imported
rather than silently lost; the durable record of "already imported" is the
stored notification plus the dismissed list.

The dismissed list is the second half of exactly-once: a notification the user
deleted is never restored by a re-delivery, on any path.

## Extension Registration

Another feature attaches behaviour to the notification centre through one port,
so the module never imports a consumer:

```ts
notifications.registerCenterExtension({
  id: "specialty-chat",
  reconcile(context) { /* returns true when stored notifications changed */ },
  onRead(context) { /* the user read these */ },
  replayQueuedOperation(operation) { /* return true when this kind is ours */ },
});
```

Rules:

- Every hook is optional and best-effort. An extension that throws is logged and
  skipped; it can never stop the centre rendering.
- Registering the same `id` twice replaces the first. Registration returns an
  unsubscribe function.
- A queued operation no extension claims is dropped rather than queued forever.
- Specialty chat registers through `SpecialtyChatNotificationsController`,
  mounted in `src/app/layout.tsx`. Registration is explicit rather than an import
  side effect so the wiring is visible in the layout.

This port is why `notifications` and `specialty-chat` no longer import each
other. The chat screen itself now lives in `src/features/specialty-chat`, not in
the notification module.

## Import Restrictions

Outside the module, these are rejected by the architecture guard and by
`test:notifications`:

- any path under `domain/`, `application/`, `infrastructure/`, `services/`,
  `presentation/`, `public/`, `shared/`, `config/`, `tests/`
- an entry point the importing tree is not allowed to use
- inside the module: reaching Capacitor plugins, the Native Platform
  notification plugins, IndexedDB/AsolDB, the service worker, `web-push`,
  Firebase/`google-auth-library`, APNs credentials, or the VAPID private key
  from anywhere but the owning adapter
- inside the module: `console.*` anywhere but the redactor
- inside the module: importing another feature's entry point

Violations report file, line, and remediation.

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

- `id`: new rows derive it as `ntok_<uid>_<platform>` with unsupported characters replaced
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
- `user_notification_tokens_uid_platform_unique` on (`uid`, `platform`)
- `user_notification_tokens_token_unique` on (`token`)

The table permits exactly one row per user and platform. A user may therefore
have at most one Web, one Android, and one iOS registration. Signing in from a
new device, refreshing a provider token, or enabling notifications again
replaces the row for that platform, including its `device_id` and token.

This is a hard database invariant, not only an application convention. The
unique index on (`uid`, `platform`) is the conflict target of one atomic
`INSERT ... ON CONFLICT DO UPDATE`, so concurrent registration attempts cannot
create two Android, two iOS, or two Web rows for the same user. The local
IndexedDB token list applies the same rule by replacing the existing entry for
the token's platform.

Registration and replacement entry points:

- Android/iOS login or session change: `NativePushController` calls
  `initialize`; when notifications are already enabled and permission is
  granted, the current FCM/APNs token is registered and replaces that user's
  row for the native platform.
- Web login or session change: `WebPushController` re-sends an existing browser
  subscription without prompting. The server replaces that user's Web row and,
  because a provider token has one owner, removes any stale row that held the
  same subscription for another account.
- Settings and the post-login opt-in: `DeviceTokenService.enable` routes to
  native registration or Web Push subscription. A granted/re-enabled device
  therefore replaces the existing row for its platform instead of adding a
  second one.

The authoritative specialty-chat opt-out lives in a second table:

```text
user_notification_preferences
```

Columns: `uid` (primary key), `specialty_requests_enabled`, `updated_at`.
Reads use this table; writes update it and mirror the value onto every token row
of the same user.

Normal device removal is a soft delete: `enabled` becomes false and
`deleted_at` is set. A stale conflicting row is physically deleted only when
the same provider token moves to its current user, and the cardinality migration
physically removes historical duplicate rows before creating the unique index.

Because a soft-deleted row keeps both its primary key and its place in the
`(uid, platform)` unique index, `upsert` matches deleted rows too and revives
the platform registration with the newest device id, provider token, and
locale. The authoritative specialty-request preference remains in
`user_notification_preferences`.

If the same provider token already belongs to another user/platform row, that
stale row is deleted before the token moves to its single current owner. The
database migration also deletes older duplicate `(uid, platform)` rows before
creating the unique index, preferring an active row and then the most recently
seen or updated row.

## Notification Lifecycle

1. A module publishes a custom notification, template notification, or business event through `NotificationBus`.
2. `EventNotificationMapper` converts business events into template IDs.
3. `NotificationBuilder` resolves the template, variables, deep link, priority, channels, targets, group key, and sound.
4. `NotificationSender` stores the notification in AsolDB, applies routing, updates badge count, emits UI refresh events, and records analytics.
5. The notification center reloads through `useNotifications`.
6. Opening, marking all as read, or dismissing a notification updates badge state and emits a UI refresh event so `/notifications` and the bottom bar stay in sync.
7. Dismissing a notification also remembers its `id` and `dedupeKey`; repeated Web Push or Android tray imports with the same identity are ignored.

## Publishing Locally

Client business modules publish through the public API. `NotificationBus` still
exists inside the module but is no longer exported: a caller that could hold it
could also hold its listener set and its builder.

```ts
await notifications.publishEvent({
  event: { name: "orders.created", uid, dedupeKey, variables },
  locale: "ar",
});
```

Three publish operations, all local-first — they build the notification, store
it in AsolDB, and refresh the badge on this device. None of them sends push:

- `publishTemplate(input)` — build from a template and store locally.
- `publishCustom(input)` — build from caller-supplied title/body.
- `publishEvent({ event, locale })` — map a business event to a template, then
  publish. Resolves `null` when the event has no mapping.

Every notification must include a stable `dedupeKey`. An optional
`notificationId` may be supplied when an upstream event already has a stable ID.

Current consumers:

| Caller | Operation | Template |
|--------|-----------|----------|
| `src/features/cart/presentation/CartPageContent.tsx` | `notifications.publishEvent` | `orders.created` (buyer, local) |
| `src/app/api/orders/from-cart` | signed grant | `order.received` (each seller) |
| `src/app/api/orders/custom-request-from-profile` | signed grant | `order.received` (seller) |

Server-side flows do not go through the bus. The main app serves no send route at
all — fan-out lives on the
[notifications service](notifications-service-module.md) — so
the public API deliberately exposes no server-side send.
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
| Orders | `order.created`, `order.received`, `order.updated`, `order.sellerAccepted`, `order.sellerRejected`, `shipment.updated`, `return.requested` |
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
route: { href: "/orders/ord_123", label: "View Order" }
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

## Post-Login Opt-In Dialog

Nothing is registered until the user agrees. `NotificationOptInController` owns
that moment and runs on **every platform** — Android, iOS, and the browser. It
is the only one of the three notification controllers in `src/app/layout.tsx`
that renders UI; the other two render `null`.

| Controller | Platforms | Renders |
|------------|-----------|---------|
| `NotificationOptInController` | all | the opt-in dialog |
| `NativePushController` | Android, iOS | nothing |
| `WebPushController` | all | nothing |

### When it appears

It listens for `AUTH_LOGIN_COMPLETED_EVENT`, dispatched by `useLogin` after a
fresh interactive login. Session hydration does not dispatch it, so a returning
user is never interrupted on an ordinary page load.

The dialog is delayed `4200 ms` so it does not collide with the post-login
redirect and the success toast, and the pending timer is dropped if the user
signs out or switches account before it fires.

### What it shows

One pure function, `resolveNotificationPromptAction`, decides — so login
hydration, blocked permissions, browsers without Web Push, and old Android all
agree:

| State | Action |
|-------|--------|
| Not authenticated | `hidden` |
| No push transport on this platform (`pushSupported === false`) | `hidden` |
| Permission `unsupported` | `hidden` |
| Device already enabled **and** permission granted | `hidden` |
| Permission `denied` or `blocked` | `open-settings` |
| Anything else | `request` |

### How the platforms differ

They mostly do not. The device-token service hides the split behind three operations,
so the controller never branches on the platform itself:

| Method | Native | Browser |
|--------|--------|---------|
| `isPushSupported()` | `isNativePush()` | the Web Push adapter — service worker, `PushManager`, and a secure context |
| `isDeviceEnabled()` | stored per-platform enabled flag | an active `PushSubscription` |
| `enable(uid, phone)` | registers the FCM/APNs token | subscribes to Web Push |

The one place the platform still shows through is the blocked state, because
only the Android shell can deep-link to its own settings screen. The dialog
therefore takes `canOpenSettings`, read from
`PermissionManager.canOpenSettings()` rather than inferred from "is this
native" — `openSettings` is unimplemented on iOS and impossible in a browser,
so both would otherwise get a button that always resolves `false`:

| | Android | iOS and browser |
|---|---------|-----------------|
| `canOpenSettings()` | `true` | `false` |
| Blocked copy | `permissionPrompt.denied` | `permissionPrompt.deniedManual` |
| Primary button | open app settings | re-check |
| Recovery | `visibilitychange` re-checks on return from settings | the user re-checks after changing the permission themselves |

In a browser, `Notification.permission === "denied"` is an origin-level block:
the application cannot show the native permission prompt again or turn the
permission back on. The dialog and the `/settings/notifications` action
therefore explain that the user must open the site's controls beside the address
bar, change Notifications to **Allow**, and select **Try again**. The retry
first reads the permission again and only creates/registers the Web Push
subscription after it is granted; it never exposes the internal
`notificationPermissionDenied` error to the user.

The `visibilitychange` listener is harmless where it cannot fire usefully, so it
stays attached for any blocked state.

A browser with no Web Push support at all — an insecure origin, or no service
worker — resolves to `hidden`, because a dialog that cannot enable anything is a
dead end. Those users still have the manual toggle in `/settings/notifications`.

### The settings page follows the same contract

`/settings/notifications` is the second surface for this state, so it obeys the
same three rules rather than restating them:

1. The **open app settings** button renders only where
   `permission.canOpenSettings` is true — read from the diagnostics snapshot,
   not inferred from "is this native". On iOS and in a browser the primary
   action becomes **re-check** instead, because `openSettings()` there resolves
   `false` every time.
2. A blocked permission replaces the enable action with a re-check on every
   platform. The app cannot re-prompt once blocked, so an enable button would be
   a dead control.
3. Granting is not the end of the flow. Both the re-check and the
   `visibilitychange` return call `enableDevice`, which registers the FCM/APNs
   token or creates the Web Push subscription — a granted permission with no
   transport delivers nothing.

### Files

```text
presentation/NotificationOptInController.tsx      the dialog's states and effects
presentation/NotificationPermissionPrompt.tsx     the dialog itself
application/notification-permission-prompt-policy.ts   the pure decision
public/notification-facade.ts                     the use cases behind it
tests/notification-permission-prompt-policy.test.ts    its contract
```

### The push switch is per device, not per account

Two different things can stop a push arriving, and the settings page exposes
only the first:

| | Device switch (`enableDevice` / `unregisterDevice`) | Account mute (`pushEnabled`) |
|---|---|---|
| Scope | this device alone | every device on the account |
| Stored in | `user_notification_tokens` row + the native enabled flag / Web Push subscription | `user_notification_preferences.push_enabled` |
| Off means | this device's token is deleted and its subscription dropped; other devices keep receiving | the server skips the send for this uid before it ever looks up a token |
| Re-enabling | re-registers this device | needs no re-registration anywhere |
| Has a control | **yes** — the switch on `/settings/notifications` | **no** |

The device switch is safe to describe as "this device only" because
`DeviceTokenService.unregister` reads the token list from this device's own
AsolDB store and deletes the server rows **by `deviceId`**. It can never reach
another device's registration.

The account mute has no UI: silencing every device at once was not the
behaviour users expected from a switch on a device's own settings page. The
column and its server gate remain, so `notifications.setPushPreference` is still
the way to mute an account programmatically. Because an account could have been
left muted by the previous UI, enabling a device repairs a stored `false` back
to `true` — otherwise a user would register a device and still receive nothing,
with no control left to explain why.

### Files

The settings surface lives outside the module, because it also renders account
preferences the notifications module does not own:

```text
src/app/settings/notifications/page.tsx                       the route
src/features/settings/presentation/NotificationsSettingsPageContent.tsx  the page shell
src/features/settings/presentation/NotificationDeviceSettingsCard.tsx    device + chat state
```

## Device Token Flow

The internal device-token service owns native token registration, listing, and removal; callers reach it through `notifications.registerDevice`, `listDevices`, and `unregisterDevice`.
`WebPushBrowserService` owns the browser subscription path. Both persist through
the same server APIs:

```text
POST   /api/notifications/device-token
DELETE /api/notifications/device-token?uid=&phone=&deviceId=&tokenId=
```

Native outbound push (Capacitor only) uses two additional main-app routes:

```text
POST /api/notifications/recipient-tokens   # verify grants; return FCM tokens + send payload
POST /api/notifications/mobile-push/unlock # verify identity; decrypt embedded Firebase credentials
```

See [Notification Bridge Module](notification-bridge-module.md) for provisioning
(`npm run provision:mobile-push`) and the encrypted credential blob contract.

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
| Turning the device switch off in `/settings/notifications` | Web Push and native both. This device only — the tokens are deleted by `deviceId`. |
| Clear application data in `/settings` | Runs before `clearAllClientStorage`. |
| Sign out, any platform | `useLogout` unregisters before clearing the session. Failures are swallowed so sign-out itself never blocks. |
| Switching accounts on a native device | `NativePushController` also unregisters the previous uid when it sees the change. |

Removing the token is what stops delivery: without it the browser or handset
keeps receiving the previous user's push messages, and the service worker keeps
writing them into AsolDB under that uid.

### Token rotation

The push provider may replace a device's token at any time without any action
by the user or the application. `NativePushService` keeps a permanent
`onPushToken` subscriber registered in `ensureListeners()`, alongside the
received and action listeners. `DeviceTokenService` injects the handler that
stores the new token locally and re-registers it with the server, so only the
application layer performs persistence — `infrastructure/` never reaches up into
`application/`.

The permanent listener stands down while `register()` is in flight (guarded by
`registering = true`) and ignores a value it has already reported
(`lastTokenValue`), so one rotation produces exactly one server registration.
A failed rotation is logged at `warn` level and not retried; the device
automatically re-registers on the next sign-in, language switch, or settings
toggle.

**A rotation never opts a device in.** The handler returns early unless the
stored per-platform enabled flag is already true. This is not a redundant check:
`initialize()` sets the active uid and attaches these listeners on every start,
*before* it knows whether push is enabled, and Android delivers `onNewToken`
regardless. Without it, a rotation arriving on a device whose owner had turned
the switch off would flip the flag back to true and re-register the device with
the server — a setting silently reversed with no user action behind it.

Native callback that feeds the rotation event:

| Platform | Native callback |
|----------|-----------------|
| Android | `AsolPushMessagingService.onNewToken` (Firebase Messaging) |
| iOS | `messaging(_:didReceiveRegistrationToken:)` in `AppDelegate.swift` |

## Device Language

Push text is built in the language of the receiving device.

- Each token row stores a `locale` (`ar` or `en`), sent by the client at registration time from the stored app preferences.
- `NotificationSendService` groups a user's tokens by transport **and** language, then builds one payload per group.
- Tokens registered before this column existed default to `ar`, and the caller's `locale` is used only when a token has none.
- Changing the language in the app, signing in again, or receiving a spontaneous token rotation all re-register the token with the current locale. `WebPushController` listens for the document-locale event and calls `notifications.refreshDeviceLocale`, which never prompts for permission and does nothing when no subscription exists.

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

**The two backends never call each other on web.** The main app has no code path to the
notifications service and the service has no code path back. The browser is the
only thing that touches both on web.

```text
1. browser ──► main app          "accept this order"
2.         ◄── order + signed notification grant(s)
3. browser ──► notifications service   the grant
4.                                     verify signature, fan out to devices
```

### Native installed shells (Capacitor)

On Android and iOS the notifications service is **not** in the delivery path.
The [notification bridge](notification-bridge-module.md) native branch:

1. Ensures Android notification channels exist (`NativeCore.ensureNotificationChannels`).
2. Resolves recipient FCM tokens through `POST /api/notifications/recipient-tokens`
   (grant verification on the main app).
3. Builds template text with `NotificationBuilder` and resolves the Android channel
   with the same `resolveAndroidChannelId` rule as the server FCM provider.
4. Sends via FCM HTTP v1 using credentials unlocked once through
   `POST /api/notifications/mobile-push/unlock`.

The main app never holds plaintext Firebase credentials in environment variables
for this path — only the unlock key and an encrypted blob. The blob is also baked
into the bundle as `NEXT_PUBLIC_ASOL_MOBILE_PUSH_CREDENTIAL_BLOB`. Provision with
`npm run provision:mobile-push`.

```text
1. device  ──► main app          business action + grant in response
2. device  ──► main app          recipient-tokens (verify grant → tokens)
3. device  ──► FCM HTTP v1       direct send (after one-time unlock)
```

Web behaviour is unchanged.

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

Device-token registration and broadcast recipient listing stay on the main app:
they need the users database for identity checks and masked contact details.
The notifications account never receives users, product, or shard credentials.

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

Push is intentionally behind adapters, all under `infrastructure/`:

| Adapter | Owns |
|---------|------|
| `capacitor/capacitor-push.service.ts` | FCM/APNs listeners, registration, channels, the delivered-tray sweep |
| `capacitor/capacitor-native-inbox.service.ts` | The Android device-local notification inbox: list, acknowledge, clear, tap |
| `capacitor/capacitor-permission.service.ts` | The notification permission, via the Native Platform Permission Manager |
| `capacitor/capacitor-local-notification.service.ts` | On-device display of a notification the app produced |
| `capacitor/capacitor-badge.service.ts` | The application badge |
| `capacitor/capacitor-platform.service.ts` | Which platform this is |
| `web-push/web-push-browser.service.ts` | Service-worker registration, `PushManager` subscription, browser permission |
| `push-device-store.ts` | This device's push id and opt-in flag |
| `asol-notification-repository.ts` | Everything stored in AsolDB |

Each is the only file allowed to touch its transport; the architecture guard
rejects the same call anywhere else. Future push providers plug in behind these
adapters or behind the server-side provider interface. Firebase and APNs
credentials remain server-side only.

## Application States

### Foreground

The app saves the notification to AsolDB, updates the badge, emits center refresh events, and can display a browser notification when permission is granted. Badge refresh counts only unread notifications that include the `badge` target.

The two native platforms present a foreground push differently, and the module
compensates so they behave the same:

| Platform | Who presents it |
|----------|-----------------|
| iOS | The OS, from `PushNotifications.presentationOptions` in `capacitor.config.ts` (`badge`, `sound`, `banner`, `list`). The payload's `aps.sound` plays. |
| Android | Nobody by default. The message is data-only, and `AsolPushMessagingService` deliberately stays quiet while the Activity is resumed — it persists the payload and forwards it to JavaScript, and the WebView presents the banner. |

So `CapacitorPushService.presentForeground` schedules a local notification on
**Android only** — doing it on iOS would show the same notification twice. It is
skipped for data-only deliveries and specialty-chat receipts, which carry no
user-facing text, and for notifications whose identity is in the local dismissed
list, matching the tray import and the service worker.

On Android, channels are created during activity startup and again during native
push initialization, regardless of the notification permission — a channel is a
declaration the settings screen reads, not a notification, so it needs no grant
and is created before the permission is requested. A denied grant leaves the
channels in place and only stops device registration and posting.
The application-owned Android bridge is the only creator, and it sets the sound
from the stable resource-name URI
`android.resource://hgh.asol.app/raw/custom_notification`; the numeric
`R.raw.custom_notification` reference is kept in code purely so Release resource
shrinking cannot remove the asset.

The legacy tray sweep at startup does not go through this path: those
notifications were already displayed, with sound, by the system. New
application-owned notifications are marked and excluded from that sweep because
their complete payload is imported from the native inbox instead.

A local notification carries the same flat payload a push does, so tapping one
is handled by `LocalNotifications.onAction` and routes through exactly the same
handler as a tapped push. Without that listener the deep link of anything the
device displayed itself would be lost.

A duplicate delivery presents nothing. The adapter shows a banner only when the
receive handler reports that a **new** notification was stored, so a push
Firebase delivers twice produces one row and one banner.

The foreground path is wired by `NativePushController`, mounted once in
`src/app/layout.tsx`. It gates on `getDiagnostics().nativePush`, drives the
module through `notifications.initialize`, and owns nothing but the deep-link
navigation and the resume listener — persistence, dedupe, read-marking, and
presentation all happen before its handlers run. It renders nothing.
`WebPushController` is mounted next to it, forwards service-worker messages to
the window, and re-registers the token after a language switch on every
platform.

### Background

On Android the app's own `AsolPushMessagingService` receives the message,
persists it to the device-local inbox, and only then posts the notification. If
the durable write fails, no tray notification is posted because its tap would
have nothing recoverable to import. The WebView
is not running, so nothing in the JavaScript module executes; the pending record
is imported when the app next becomes active — see Resumed.

Only a genuinely foreground activity receives Capacitor's live callback.
Background and dead-process deliveries use the native inbox exclusively; they
are not forwarded into Capacitor's retained `lastMessage`, which would replay at
the next launch and could produce a second banner. The live mapper also rejects
a payload whose owning uid differs from the active session, so a delayed push
for a previous account cannot cross the IndexedDB partition boundary.

On Android the native receive callback may still be delivered briefly while
the activity is transitioning out. The adapter therefore reads the document's
current visibility instead of assuming every callback is foreground. A hidden
WebView never creates a local copy of a notification the operating system has
already displayed; this prevents duplicate tray entries and duplicate sound.

### Resumed

`NativePushController` listens for the app becoming active and calls
`notifications.importDelivered({ uid })`, which drains the device-local inbox
and then sweeps the tray. This is how a notification that arrived while the app
was hidden reaches the centre without a restart.

The import is single-flight per user, so a resume that coincides with startup
does the work once. Imports skip empty `ASOL` placeholders and anything already
remembered in `user:<uid>:dismissed`, and the batch is written under one storage
lock so a concurrent live delivery cannot be lost.

### Terminated

No cloud persistence is used for notification-centre state, and none is added by
any of this. While the app is terminated, Android keeps the pending payload in
the application-private device-local inbox described in the next section, and
`initialize` imports it at the next start. A tap that cold-starts the app is a
durable pointer into that inbox rather than a retained callback: it survives an
Activity recreation, is replayed if the start is interrupted, and is discarded
only after the notification is in IndexedDB.

A restart re-imports the same records; storage dedupe and the dismissed list
make that a no-op rather than a duplicate.

## The Android Device-Local Notification Inbox

### Why it exists

The notification centre is IndexedDB, and IndexedDB lives inside the WebView. A
WebView cannot execute while the app is backgrounded with its process reclaimed,
swiped away, or not yet started — which is when most pushes arrive. Four things
compounded into lost notifications:

1. **IndexedDB is unreachable while the process is dead.** Nothing could record
   an inbound push at the moment it arrived.
2. **Recovery read `NotificationManager.getActiveNotifications()`.** The tray is
   not a durable store.
3. **A tapped `autoCancel` notification leaves the tray before anything reads
   it.** The single most important case — the user opening the app *by* tapping
   the notification — was the case where the tray was already empty.
4. **The cold-start tap relied on Capacitor's retained callback**, with no
   application-owned acknowledgement, so an interrupted start lost it.
5. **The tray-derived record was a reconstruction.** Title, body, and channel
   were all it could recover; metadata, template id, group key, and the business
   route were gone.
6. **Android auto-displayed the message.** A payload carrying a `notification`
   block is rendered by the Firebase SDK itself when the app is backgrounded or
   dead, and `onMessageReceived` is never called — so no application code ran at
   all.

### The lifecycle

```
FCM receipt
  → AsolPushMessagingService validates and normalizes the complete payload
  → persists it into the local, private native inbox           (before display)
  → posts the notification on the existing ASOL channel/sound
  → app or session start
  → read pending records for the authenticated uid
  → persist them into IndexedDB exactly once
  → refresh the notification centre and the badge
  → acknowledge, deleting the native records
```

**Persist before display, save before acknowledge.** Everything after the write
can fail — the post, the tap, the launch, the WebView — and the notification is
still recoverable. Nothing before it can be.

### What it is not

It is a **temporary handoff buffer**, not a notification history:

- Notification bodies and notification history are **never** stored in Turso, in
  a cloud database, on a server, or in any remote notification table. Nothing in
  this path sends a notification anywhere.
- **IndexedDB/AsolDB is the permanent notification centre.** It is the only
  durable home for a notification.
- The native inbox exists **only** for the window in which IndexedDB is
  unavailable, and a record is deleted the moment — and only the moment — the
  notification is confirmed present in IndexedDB.
- Server-side storage continues to hold **device tokens and preferences only**,
  never notification bodies and never notification history.

### Where it is stored

| Property | Value |
|----------|-------|
| Location | `getFilesDir()/asol_notification_inbox/inbox.bin` |
| Visibility | Application-private; unreachable by other applications |
| Encryption | AES-256-GCM under an AndroidKeyStore key that never leaves the keystore |
| Fallback | Application-private plaintext, recorded in the file header, when the keystore cannot provide a key — a working inbox beats a lost notification |
| Writes | Android `AtomicFile`; `openRead()` restores the previous complete value after an interrupted write, and an unreadable existing inbox makes enqueue fail rather than overwrite pending records |
| Backup | Excluded: `allowBackup=false` covers the whole application |

### What a record keeps

The **complete original FCM data map**, untouched, plus the normalized fields
the native display path needs: owning uid, notificationId, dedupeKey, title,
body, route href and label, category, priority, sound, groupKey, templateId,
metadata (`meta_*`), creation timestamp, channel id, receive timestamp, and the
system notification id and tag it was posted under.

The web layer maps that data map through **the same domain mapper a live
foreground push goes through**, so a notification delivered while the process
was dead produces identical stored fields to one delivered while it was running.
There is no second definition of what a notification is.

### UID isolation

Every record carries the uid the push was addressed to, and every read and every
acknowledgement is scoped to it — natively in the store, and again in the web
adapter. Consequences, all of them deliberate:

- A record is **never** imported under a different authenticated user.
- A record whose owner is not signed in **waits**; it is not discarded.
- **Signing out deletes nothing.** Pending notifications belong to the user they
  were addressed to and are never handed to the next account on the device.
- **Account deletion and "clear all local data" clear it completely**, through
  `notifications.clearLocalInbox()`, called from `clearAllClientStorage`.

### Deduplication

The record id is derived from `uid + notificationId`, so an FCM redelivery
replaces its record rather than stacking a second. In IndexedDB, dedupe is by
`dedupeKey` under a per-user lock. Together they mean that live receive, the
native inbox, the tray sweep, a tap callback, a restart, and a repeated import
produce **exactly one** row.

Acknowledgement policy — only outcomes that mean IndexedDB durably knows the
notification:

| Outcome | Acknowledged | Why |
|---------|--------------|-----|
| stored | yes | the row exists |
| duplicate | yes | an identical row already exists |
| dismissed | yes | the user deleted it; re-importing would resurrect it |
| unmappable | yes | no payload can ever produce a row, so retrying is a loop |
| the batch threw | **no** | nothing is known, so every record is retried |

An import never clears the Android tray.

### Retention

Bounded and deterministic, applied in this order:

1. **Age:** records older than **14 days** are dropped.
2. **Count:** at most **200** records; the oldest are dropped first.

Age before count, so an eviction never removes a recent unacknowledged record in
order to keep a stale one.

### Cold-start tap routing

The launch Intent carries the record id, the owning uid, and the notification
id, under an immutable `PendingIntent` with `FLAG_UPDATE_CURRENT` and a stable
request code. `MainActivity#onCreate` synchronously commits this payload-free
pointer to application-private `SharedPreferences` before the bridge exists. It
therefore survives both Activity recreation and complete process death while
the native inbox retains the actual notification content.

A tap then runs one protocol, identical whether the process already existed:

1. read the tap;
2. verify it belongs to the authenticated user — a tap for another account is
   left pending, never applied to whoever is signed in now;
3. import **everything** pending, so untapped notifications reach the centre too;
4. mark **only** the tapped notification read;
5. clear the tap **last**, so an interruption anywhere above replays it;
6. open `/notifications`.

If the target is absent after import but its native record still exists, the tap
is retained for the next launch rather than cleared. A stale tap is cleared only
when neither IndexedDB nor the native inbox contains its target.

The tap opens the notification centre, not the business deep link. The route is
preserved on the stored notification and is followed when the user opens that
card — so a cold start always lands somewhere that shows every notification that
arrived, rather than jumping into one order and hiding the rest.

### Badge refresh

The badge is derived from IndexedDB, so it is correct as soon as the import
lands: `receiveBatch` refreshes the badge and emits the change event, which
`useNotifications` — and through it `BottomNavBar` — listens for. Untapped
imported notifications stay unread and count immediately.

### Android delivery is application-owned

The FCM provider sends **Android tokens a data-only message**: no top-level
`notification` block and no `android.notification` block, so Firebase always
calls `AsolPushMessagingService`. The resolved channel travels in the data map
as `androidChannelId`, and the native side falls back to resolving it locally
with the same rule when the value names a channel this build does not have.
Visible Android messages are sent at `HIGH` priority, because a data message has
to wake a dozing app before anything can be shown.

**iOS/APNs and Web Push are untouched.** Apple tokens keep the alert payload and
the `apns` block they always had; Web Push has its own provider entirely.

Exactly one service may claim `com.google.firebase.MESSAGING_EVENT`: Firebase
delivers to one, chosen by manifest resolution order. The Capacitor plugin's
`MessagingService` is therefore removed with `tools:node="remove"` and replaced
by `AsolPushMessagingService`, which forwards to
`PushNotificationsPlugin.sendRemoteMessage` and `onNewToken` so the live
JavaScript listener and token cardinality are unchanged.

While the Activity is resumed the native service does **not** post: the WebView
presents the foreground banner as it always has, with the dismissed check and
the data-only suppression. `AsolAppLifecycle` carries that flag, and a fresh
process starts with the correct answer, `false`.

### The Android force-stop limitation

If the user force-stops the application from Android system settings — or a
manufacturer's aggressive battery manager does it for them — the package enters
a **stopped state** and Android delivers it no broadcasts at all, including
FCM's. This is an operating-system policy and no application can opt out of it.

Consequences, stated accurately:

- While force-stopped, pushes are **not delivered** and therefore **not
  persisted**. They are not lost by the inbox; they never reach the device.
- Delivery resumes once the user **manually reopens** the app.
- FCM redelivers a message that is still within its TTL, so a push sent during
  the stopped window may arrive after the app is reopened. One sent outside its
  TTL will not.
- Normal swipe-away is **not** force-stop. The process is reclaimed, the app is
  not stopped, and delivery works exactly as described above — which is the case
  the inbox is built for.

### Files

| File | Role |
|------|------|
| `android/.../AsolPushMessagingService.java` | Receives the FCM message, persists, then posts |
| `android/.../AsolNotificationInboxStore.java` | The encrypted, app-private, bounded store |
| `android/.../AsolNotificationRecord.java` | The record, keeping the complete payload |
| `android/.../AsolNotificationTapProtocol.java` | The application-owned tap handshake |
| `android/.../AsolNotificationInboxPlugin.java` | The bridge: list, acknowledge, clear, tap, tray sweep |
| `android/.../AsolAppLifecycle.java` | Whether the Activity is in front, so nothing rings twice |
| `packages/native-core/src/adapters/notifications.adapter.ts` | The typed bridge |
| `notifications/infrastructure/native/native-inbox.service.ts` | The adapter |
| `notifications/application/native-inbox-service.ts` | Import, acknowledge, and tap orchestration |

## Offline Queue

`notificationOfflineQueue` holds operations that could not reach the server.

Specialty-chat receipts are the queued kind today. They are emitted on the
user's behalf when a card is delivered or opened, so a failure has no manual
retry — the sender would wait forever on a receipt that never arrives.

- `notifications.enqueueRetry({ uid, kind, id, payload })` records the operation,
  keyed so the same receipt is never queued twice.
- `synchronizeNotificationCenter` replays the queue when the device is online.
  Replay is offered to the registered extensions — the service never interprets a
  payload, because only the feature that enqueued it knows the shape.
- An operation is dropped after five failed attempts. One no extension claims is
  dropped rather than kept forever.
- Every queue change goes through `mutateOfflineQueue`, so an enqueue racing a
  sync cannot be erased by the sync's rewrite. The replay itself runs outside the
  storage lock — it makes network calls — and the outcome is applied by identity
  afterwards.
- Sync is single-flight per user. `useNotifications` triggers it on mount, on
  every change event, and when the network returns; in a burst those are one
  request.

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

A single asset carries the sound on every audible path:
`assets/google-play/custom_notification.mp3` on Android and
`ios/App/App/custom_notification.caf` on Apple (4.35s LPCM, under the 30s limit
above which iOS silently substitutes the system sound).

Because Android reads a notification's sound from its **channel** on API 26 and
above, "which sound" and "which channel" are one question. It is answered in one
place — `src/features/notifications/domain/notification-sound.ts` — and read by
all three senders: the FCM provider, the direct APNs provider, and the on-device
local notification.

| Value | Android | Apple | Browser |
|-------|---------|-------|---------|
| `default` | category channel, custom sound | `aps.sound = custom_notification.caf` | browser default |
| `urgent` | `asol_urgent_v4` (importance 5) | same file, `apns-priority: 10` when the priority is high | browser default |
| `silent` | `asol_silent_v4`, importance 2 | no `sound` key, `interruption-level: passive` | `silent: true` |

There is one sound asset, so `urgent` cannot mean a different file. It means the
channel that interrupts — the same one `priority: critical` uses.

Silence is a channel, not a missing field: a channel created without a sound
still inherits the *system* sound, and Android only stops playing a channel's
sound below importance 3. Omitting `sound` from the payload is not enough.

`notification-sound-contract.test.ts` compares the constants against the asset
files on disk, the channels registered in the Native Platform module, and the
manifest's default channel. Every mismatch between them is silent at runtime —
Android and iOS both fall back to the system sound rather than reporting an
error — so the build fails instead.

Known bounds:

- The browser cannot play a custom sound. The Notification API has no sound
  option; only `silent` is expressible.
- A local notification on Android 7 (`minSdkVersion` is 24) declared `silent`
  still makes the system sound: the Capacitor plugin calls `setDefaults(ALL)`
  when no sound is given, and pre-Oreo has no channel to override it.
- A `silent` push can no longer arrive before the channels exist on Android.
  `AsolPushMessagingService` ensures the channel set before it posts anything,
  in addition to `MainActivity.onCreate`, every `initialize()`, and every
  `register()`. Creating a channel that exists is a no-op and cannot change its
  sound, so the extra call is free.

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

## Testing Matrix

Source-text checks are kept where they guard a *contract* that cannot be
observed at runtime (a Java channel id, an asset on disk, the service-worker
mirror). They are not treated as proof of behaviour. Behaviour is tested by
driving real flows.

### Suites

| Suite | What it proves |
|-------|----------------|
| `tests/notification-module-boundary.test.ts` | Entry points, import restrictions in both trees, the root barrel exports one runtime object, every command is routed, unknown commands fail closed, compile-time command/result types |
| `tests/integration/notification-flow.integration.test.ts` | 61 behavioural scenarios through the public API |
| `tests/notification-builder.test.ts` | Template resolution and variable interpolation |
| `tests/notification-sound-contract.test.ts` | Sound constants against assets, Native Platform channels, manifest default |
| `tests/notification-channel-parity.test.ts` | `resolveAndroidChannelId` matches native Java across all categories/priorities/sounds, every `android_push` template, and mobile-push FCM payloads |
| `tests/mobile-push-*.test.ts`, `packages/account-bridge/src/tests/mobile-push.test.ts` | Encrypted credential provisioning contract, unlock API, no server secrets in the native send graph |
| `tests/android-notification-inbox-contract.test.ts` | The application-owned Android delivery path: data-only FCM payload, one messaging service, persist-before-display, private/encrypted/bounded storage, uid-scoped acknowledgement, tap protocol, save-before-acknowledge, `/notifications` routing |
| `androidTest/.../NotificationInboxInstrumentedTest.java` | The device-only properties: real storage location, real encryption, Activity recreation, retention, launch-Intent tap identity, multi-record import |
| `tests/notification-local-storage-contract.test.ts` | No server table for content; service worker matches AsolDB |
| `tests/notification-center-model.test.ts` | Grouping, preservation, chat ordering |
| `tests/notifications-service-module-contract.test.ts` | The microservice is self-contained and its mirror is reproducible |
| `tests/notification-provider-registry.test.ts`, `web-push-provider.test.ts`, `notification-grant.test.ts`, `notification-test-service.test.ts`, `notification-locale-routing.test.ts`, `notification-broadcast-delivery.test.ts`, `push-token-kind.test.ts`, `notification-permission-prompt-policy.test.ts` | Server-side provider, grant, locale, and policy contracts |

### The integration harness

`tests/integration/notification-harness.ts` replaces every external edge with a
deterministic fake — IndexedDB, the push plugin, the local-notification plugin,
the permission manager, the platform, the HTTP client, the grant bridge — and
leaves everything inside the module real. Fakes are installed into the module
cache before the graph loads, and the graph is purged between scenarios so the
locks and listener registries start fresh; leaking them would hide exactly the
concurrency bugs the tests exist to catch.

No scenario calls the repository to arrange a state the flow under test should
have produced.

### Scenario coverage

| Scenario | Covered by |
|----------|-----------|
| Android foreground: exactly one visible local notification | integration |
| iOS foreground: no duplicate banner | integration |
| Push received and persisted natively while no WebView exists | integration + instrumented |
| Background / terminated delivery imported at next start | integration |
| Resume without tap re-imports the inbox and the tray | integration |
| Normal launch imports multiple pending records | integration |
| Activity / process recreation preserves pending records | integration + instrumented |
| Cold start from a tap: all imported, only the tapped one read | integration |
| Cold-start tap identity comes from the launch Intent, before any JavaScript | instrumented |
| IndexedDB failure leaves the record for a retry | integration |
| Cold-start tap survives an IndexedDB failure and replays after recovery | integration |
| A successful retry acknowledges only what it persisted | integration |
| Tray + native inbox + tap + live + repeated import: one row | integration |
| Full payload fields survive native persistence and bridge serialization | integration + instrumented |
| Wrong-user records never imported; pending records wait for their user | integration + instrumented |
| Badge counts untapped imports after startup | integration |
| Stored notification keeps its original business deep link | integration |
| Retention limits and expiry | instrumented |
| Explicit local-data clearing clears the native inbox | integration |
| Storage is application-private and encrypted at rest | instrumented |
| Tap routing, push and local plugin | integration |
| Duplicate delivery: one row, one banner | integration |
| Concurrent deliveries: none lost, badge correct | integration |
| Concurrent tray imports: exactly once | integration |
| Process restart: no duplicate import | integration |
| Relaunch persistence, including read state | integration |
| Dismissal survives re-delivery | integration |
| Notification for a different user rejected | integration |
| Data-only delivery stored, never presented | integration |
| Malformed payload: unsafe route, prototype key, bad enum, bad timestamp, empty placeholder | integration |
| Permission denied and revoked | integration |
| Token refresh | integration |
| Push-token rotation re-registers without a second device row | integration |
| A rotation on a switched-off device neither registers nor re-enables it | integration |
| Plugin unavailable | integration |
| Unsupported Web Push environment | integration |
| Logout / user change | integration |
| Offline receipt queued, replayed once, kept on failure, dropped when unclaimed | integration |
| Secrets absent from diagnostics, metadata, and logs | integration |
| Unknown command fails closed | integration + boundary |
| Import boundaries in `src` and `services/notifications` | boundary + `architecture:check` |
| Audible sound on a real handset | **not automatable — manual** |
| End-to-end FCM delivery to a backgrounded, swiped-away handset | **not automatable — manual** |
| Behaviour after an explicit Android force-stop | **not automatable — manual**, and bounded by the OS limitation above |

## Build And CI Enforcement

There are **no GitHub Actions workflows in this repository**; `.github/workflows`
is empty and
[`16-deployment-targets.md`](../01-architecture/data-layers/16-deployment-targets.md)
records that Actions is intentionally unused. Enforcement lives in the npm
scripts, which is what Vercel runs on a push:

| Gate | Command | Notification checks |
|------|---------|---------------------|
| Application build | `npm run build` | `architecture:check`, then `test:notifications` |
| Static / mobile bundle | `npm run build:static` | `verify:notifications` |
| Repository verification | `npm run verify:all` | `architecture:check`, `test:notifications` |
| Focused gate | `npm run verify:notifications` | everything, ~50 s, no side effects |

`verify:notifications` reads the working tree, mirrors service sources into a
temporary directory, and touches no database, no remote, and no generated
artefact.

## Android Channel Policy

Channel ids are `asol_<name>_v4` and are declared once in
`domain/notification-sound.ts`, mirrored by the Native Platform module and the
Android manifest.

The channels are created at activity/UI startup in `MainActivity.onCreate` and
again, idempotently, during native push initialization. Neither needs
`POST_NOTIFICATIONS`: creating a channel posts no notification, it declares an
entry in the Android settings screen. **The first creation on a device decides
the sound forever**, so it must already carry the final custom sound — there is
no second attempt to correct it.

The sound is set from a stable resource-name URI,
`android.resource://hgh.asol.app/raw/custom_notification`. A numeric resource id
is regenerated by every build while the channel persists across upgrades, so an
id embedded in a channel can outlive the resource it named. The numeric
`R.raw.custom_notification` reference stays in the Java code, and only there, to
keep the asset visible to Release resource shrinking.

**A new channel generation is never a workaround for an application bug.** Sound,
importance, and vibration are immutable once a channel exists on a device, so
bumping `_v4` to a new generation is the only way to change them — and it silently discards
every per-channel preference the user has set, on every installed device.

A new generation is justified only when *all* of the following hold, with
evidence:

1. An immutable channel property must change — sound file, importance,
   vibration, or lockscreen visibility.
2. The current value is demonstrably wrong on a real device, not merely
   suspected. `adb shell dumpsys notification` output showing the live channel
   is the evidence.
3. The behaviour cannot be fixed in the payload, the local-notification call, or
   the module.

If a generation is genuinely required: change the id in
`domain/notification-sound.ts`, the Native Platform channel list, and the
manifest default together — `notification-sound-contract.test.ts` fails if they
drift — document the reason and the discarded preferences in this file, and ship
it with a store build. **Never publish a channel change during development
verification.**

## Verifying On A Connected Android Device

Local, debug-only, and reversible. Nothing here publishes.

**Prohibited during verification:** creating or publishing an OTA update,
creating a release build or production package, deploying anything, changing
`versionName`, `versionCode`, the native version, the web version, or any release
manifest, and mutating live OTA or production data. `npm run build:static`
rewrites `public/asol-web-manifest.json` with release identifiers — if a step
requires it, restore that file afterwards.

Procedure:

1. `adb devices -l` — confirm exactly one device.
2. Record the baseline: `git status --porcelain > before.txt`.
3. Build and install a **debug** build only. Never a signed or release variant.
4. **Prove the device runs the working tree.** A channel dump or a passing test
   proves nothing about *which build* is installed. Compare the installed
   build's fingerprint against the one just produced — for example a marker
   string or build id compiled into the debug bundle, read back with
   `adb shell dumpsys package <id>` or from `adb logcat`. Without that, device
   observations describe the previously installed build and must be reported as
   such.
5. Exercise: foreground, background, terminated, resume, tap, duplicate
   delivery, and offline receipt with later retry.
6. Capture evidence, and keep the four kinds separate:
   - **channel configuration** — `adb shell dumpsys notification` (proves ids,
     importance, and sound *URI*; proves nothing about delivery)
   - **delivery** — notification shade, `adb logcat`
   - **persistence** — the notification centre and the badge in the app
   - **audible sound** — **not objectively confirmable over adb.** A channel
     configured with a sound URI is not proof that a sound played. State that
     manual human confirmation is required.
7. Restore: `git status --porcelain` and revert every incidental generated
   change your commands produced.

### Fresh-install channel verification

A channel keeps the sound it was first created with, so a device that already
holds ASOL channels reports the *previous* build's configuration no matter what
the working tree says. Verifying first creation therefore requires a device with
no ASOL channels:

1. Start from a true fresh install: `npm run android:build:debug` then
   `npm run android:device:install -- --without-permissions`. The install step **erases this
   application's data, storage, and notification channels on the connected
   device**. It is destructive, it is never run automatically, and it must only
   be used on a device whose owner asked for it. See
   [Installation State And Clean Testing](../07-mobile-and-release/capacitor/installation-state-and-clean-testing.md).
2. The `--without-permissions` flag deliberately leaves `POST_NOTIFICATIONS`
   ungranted. Do not use the regular install command for this check because it
   grants the permissions required by the general connected-device suite.
3. Launch the app so `MainActivity.onCreate` runs.
4. `adb shell dumpsys notification_manager | grep asol_` — the complete channel
   set must already exist, every audible channel showing
   `sound=android.resource://hgh.asol.app/raw/custom_notification`, and
   `asol_silent_v4` showing no sound.
5. `adb shell dumpsys package hgh.asol.app | grep POST_NOTIFICATIONS` — the
   permission must still be ungranted at this point.
6. Only then grant the permission and verify registration and delivery.

`NotificationChannelStartupInstrumentedTest` performs steps 2–5 as a connected
test (`./gradlew :app:connectedDebugR8AndroidTest`). It reads device state and
posts nothing; it does not reinstall, so run it immediately after the
`--without-permissions` install. In the regular device suite the permission is
already granted, so this one pre-opt-in test is reported as skipped rather than
producing a false failure; the rest of the suite still runs with the grant.

## Remaining Limitations

These are deliberate boundaries rather than defects.

| Limitation | Effect |
|------------|--------|
| Notification-center content is local-only. | History does not follow the user across devices and is lost when application data is cleared. |
| The offline queue replays receipts only. | Other operations still fail silently while offline; nothing else is queued yet. |
| Direct APNs transport requires opt-in credentials. | Apple devices issue FCM registration tokens via the Xcode SPM Firebase Messaging SDK (pinned at `12.17.0`) and route to Firebase Admin. Raw APNs tokens remain an opt-in fallback if `APNS_*` credentials are configured; see [`../07-mobile-and-release/capacitor/ios-push-notifications.md`](../07-mobile-and-release/capacitor/ios-push-notifications.md). |
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
| `web-push-notification-provider.server.ts` | Browser Web Push over the constant public key and `WEB_PUSH_VAPID_PRIVATE_KEY`. |
| `noop-notification-provider.server.ts` | Safe fallback for unknown or not-yet-configured providers. |

Current provider behavior:

- FCM uses the FCM HTTP v1 endpoint with OAuth service-account authentication and returns real per-token delivery results. It sends one message per token, at most 25 requests in flight.
- Invalid or unregistered FCM tokens are soft-deleted after Firebase rejects them.
- When Firebase credentials are missing, FCM returns `failed` with `firebaseAdminNotConfigured` and deliberately keeps the tokens — this is a server misconfiguration, not a dead device.
- APNs uses a direct HTTP/2 connection with an ES256 JWT when `APNS_TEAM_ID`, `APNS_KEY_ID`, and `APNS_PRIVATE_KEY` are configured. Unconfigured, it returns `failed` with `appleTokenNotDeliverable` and keeps the tokens.
- Web Push signs with `WEB_PUSH_VAPID_PRIVATE_KEY` and returns `queued` unless every send is rejected. Unconfigured, it returns `webPushNotConfigured` and keeps the tokens. Only `404` and `410` — the two Web Push responses for a revoked subscription — mark a token invalid; a 429 or 5xx must never cost a user their registration.
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

Browser push notifications use Web Push with a VAPID key pair. This is separate
from FCM and APNs.

**The pair is not server state.** It is split by what it actually is:

| Half | Where | Why |
|------|-------|-----|
| Public key, subject | `src/features/notifications/domain/web-push-config.ts` | Handed to every browser that subscribes — it *is* `applicationServerKey`. A database row and an authenticated API protected nothing and cost a round trip before every subscription. |
| Private key | `WEB_PUSH_VAPID_PRIVATE_KEY`, notifications account only | A real secret, held exactly like `FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64` and `APNS_PRIVATE_KEY`. |

There is no `/super-admin/vapid` page, no `notification_vapid_settings` table,
and no `web-push` API route. There is nothing to administer: a VAPID pair is
generated once and read forever.

**Rotation is a deploy, not a button.** A browser binds each `PushSubscription`
to the key it subscribed with, so replacing the pair silently invalidates every
existing subscription — the sends then fail and `NotificationSendService`
soft-deletes the tokens as dead devices. An admin page offering a "generate"
button offered a one-click way to do that. Change both halves together and
expect every browser to re-subscribe.

Runtime pages:

- User device settings: `/settings/notifications`

Security rules:

- The private key never leaves the notifications account and is never imported by client code.
- The public key is deliberately in the client bundle; publishing it is what it is for.
- Web Push subscriptions are stored in `user_notification_tokens` with `provider = web_push`.
- The stored web push token is the serialized `PushSubscription` JSON.

Browser subscription flow:

```text
post-login opt-in dialog, or the /settings/notifications toggle
  -> request Notification permission
  -> register /asol-push-sw.js
  -> PushManager.subscribe(WEB_PUSH_VAPID_PUBLIC_KEY)   no server call
  -> POST /api/notifications/device-token
  -> user_notification_tokens(provider = web_push)
```

Both entry points converge on `WebPushBrowserService.subscribe`, so a browser
that opted in from the dialog and one that used the toggle are indistinguishable
afterwards. See
[Post-Login Opt-In Dialog](#post-login-opt-in-dialog).

Reading the key from the bundle rather than an endpoint is also what lets a
static export and the native shell subscribe: neither has a server to ask
before the user is signed in.

Delivery flow:

```text
NotificationSendService                    (notifications service)
  -> token provider = web_push
  -> WebPushNotificationProvider
  -> WEB_PUSH_VAPID_PRIVATE_KEY + the public constant
  -> web-push transport
  -> browser service worker
```

An unset private key returns `webPushNotConfigured` and **keeps** the tokens:
the subscriptions are healthy, the server is not configured. `GET /api/health`
on the notifications service reports whether it is present.

`web-push-provider.test.ts` asserts that the pair handed to the transport is the
constant plus the configured secret, that the public key is 87 base64url
characters (an uncompressed P-256 point), and that the subject is a reachable
`mailto:` as RFC 8292 requires.

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
`packages/data-core/src/browser/asol-db`, because a static worker cannot import
the module. `notification-local-storage-contract.test.ts` compares the two and
fails the build when they drift — opening IndexedDB with a stale version there
throws and silently drops every browser push.

The worker source is `packages/data-core/src/browser/workers/asol-push-sw.js`.
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
- The page waits for the notifications service response and never presents the main app's `granted` placeholders as a successful send.
- The result panel reports `sent`, `queued`, `partial`, `failed`, and `no_tokens` per recipient. A recipient missing from the service response is shown as failed.
- Delivery is delegated to `NotificationSendService`.
- `NotificationSendService` routes each token to the correct registered `NotificationProvider`, such as Web Push.
- The broadcast metadata sets `source = super_admin_broadcast`, carries the caller's `requestId`, and uses `/notifications` as the default deep link.
- Broadcast `dedupeKey` is `broadcast:<sha256(title, body, audience)>` truncated to 24 characters. It is stable for the same title, body, and audience, so resending the identical message to the identical audience will not create duplicate notification-center entries.
- Selected uids are intersected with the eligible recipient list before sending; unknown or ineligible uids are dropped rather than rejected.
- A broadcast is push-only on the server. The notification-center row is created on the recipient's device by the Web Push service worker or by importing Android's device-local native inbox; the tray sweep is only a compatibility fallback for older shells. A user with no reachable device gets no local card.
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
