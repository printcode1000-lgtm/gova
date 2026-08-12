# Specialty Notification Chat

## Purpose

This module lets a buyer send one text request to sellers or service providers who selected one main specialty and one child specialty. Every provider receives an independent notification and replies privately to the buyer. Providers never receive the other providers' replies or identities.

## Storage policy

Notification delivery is the only conversation transport. The server does not create a conversation or message table and does not persist request or reply text. Received and outgoing messages are kept locally in the existing AsolDB `notifications` store. Consequently, conversation history does not synchronize between devices and is lost when local application data is cleared or the app is removed.

The server stores only device push tokens and the per-user `specialty_requests_enabled` preference. It stores no request body, reply body, conversation history, or attachments.

## User flow

1. A logged-in buyer opens the paper-plane action in the application header,
   which navigates to the full `/specialty-request` page.
2. The buyer selects exactly one main category and one selectable child specialty.
3. The buyer enters text of 1–800 characters. Images and attachments are not supported.
4. The server resolves profiles indexed for that exact pair, excludes the buyer and opted-out providers, and attempts one private push per provider.
5. The browser waits for the notifications service and counts only recipients
   with a `sent`, `queued`, or `partial` provider outcome. `no_tokens`, failed
   transports, and opted-out matches are reported as unavailable.
6. When at least one provider is reached, the page shows the exact counts for
   three seconds, then opens the chat filter in `/notifications` and focuses the
   outgoing request card.
7. Each provider replies from that notification in `/notifications`. A reply is
   shown as sent only after the notifications service reports a reachable
   transport for the buyer.
8. Replies go only to the buyer. The buyer can continue the private exchange
   using the same signed bilateral capability.

## Security and privacy

- Every API mutation verifies a 30-day signed session token issued only after password login, then verifies the current stored UID/phone identity.
- A request carries a server-signed bilateral reply capability containing request ID, buyer UID, seller UID, and expiry.
- Capabilities expire after seven days and cannot be used by a third UID.
- Request and message IDs are stable deduplication keys.
- A runtime limit allows at most five send operations per UID per minute per server instance. The counter is in-process memory, so it resets on redeploy and is not shared across instances.
- One request resolves at most 500 matching providers.
- Request text is not written to server logs or databases by the module.
- The provider opt-out is applied before delivery.

## Delivery and state

FCM chat payloads use a seven-day TTL and a unique collapse key, so distinct messages do not replace one another. Android uses the `asol_chat_v4` channel with the bundled custom sound and vibration. Web Push stores the complete specialty-chat metadata in AsolDB.

Titles come from the `specialty.request`, `specialty.replyFromProvider`, and
`specialty.messageFromBuyer` templates and are rendered in the recipient device's
language. The message body is the sender's own text, passed through as a
variable and never translated or rewritten. The specialty name in a request title
is sent in both languages so each recipient sees it in theirs.

Granted, transport-delivered, received, and read are separate states. A request of 500 providers
produces 500 grants in one response — one per provider, because each carries its
own reply capability and dedupe key — and the browser posts them in a batch:

- `grantedUsers`: the main app signed a grant authorising that provider. It does not deliver, so provider acceptance is not knowable here — the browser still has to carry the grant across.
- `deliveredUsers`: the notifications service found a usable transport and the
  provider returned `sent`, `queued`, or `partial`. This is the count displayed
  by the request page, but it still does not prove OS display.
- `received`: the recipient client imported the notification into the local center and emitted an internal data-only receipt.
- `read`: the recipient opened or marked the notification as read and emitted an internal data-only receipt.

Receipt pushes never appear as cards and do not intentionally contribute to the notification badge. They update the original outgoing local notification.

## Files

- `src/features/specialty-chat/` — domain, client, server, and composer UI.
- `src/app/api/specialty-chat/requests/route.ts` — specialty broadcast relay.
- `src/app/api/specialty-chat/messages/route.ts` — bilateral private replies.
- `src/app/api/specialty-chat/receipts/route.ts` — received/read receipts.
- `src/app/api/specialty-chat/preference/route.ts` — provider opt-out.
- `src/features/notifications/presentation/NotificationsPageContent.tsx` — local conversation cards and reply field.
- `public/asol-push-sw.js` — Web Push persistence and invisible receipt handling.

## Limitations by design

- Request, reply, and receipt actions await the browser bridge, so the UI does
  not report success while the grant hop is pending. There is still no
  server-side retry after the notifications service accepts the push. See
  [Notification Bridge Module](notification-bridge-module.md).
- Push delivery is not guaranteed by FCM, Web Push, APNs, or the operating system.
- Clearing local data, signing out, uninstalling, or changing devices removes local conversation history.
- A provider without a valid enabled device token is counted as unavailable.
- APNs delivery requires the server-only Apple signing variables documented in `data-layers/14-environment-variables.md`; an unconfigured provider returns failure and is never counted as accepted.
