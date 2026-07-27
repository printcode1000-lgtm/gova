# Specialty Notification Chat

## Purpose

This module lets a buyer send one text request to sellers or service providers who selected one main specialty and one child specialty. Every provider receives an independent notification and replies privately to the buyer. Providers never receive the other providers' replies or identities.

## Storage policy

Notification delivery is the only conversation transport. The server does not create a conversation or message table and does not persist request or reply text. Received and outgoing messages are kept locally in the existing AsolDB `notifications` store. Consequently, conversation history does not synchronize between devices and is lost when local application data is cleared or the app is removed.

The server stores only device push tokens and the per-user `specialty_requests_enabled` preference. It stores no request body, reply body, conversation history, or attachments.

## User flow

1. A logged-in buyer opens the paper-plane action in the application header.
2. The buyer selects exactly one main category and one selectable child specialty.
3. The buyer enters text of 1–800 characters. Images and attachments are not supported.
4. The server resolves profiles indexed for that exact pair, excludes the buyer and opted-out providers, and attempts one private push per provider.
5. The response reports matched, provider-accepted, and unavailable user counts. Provider accepted does not guarantee operating-system delivery.
6. Each provider replies from that notification in `/notifications`.
7. Replies go only to the buyer. The buyer can continue the same private exchange from the received reply.

## Security and privacy

- Every API mutation verifies a 30-day signed session token issued only after password login, then verifies the current stored UID/phone identity.
- A request carries a server-signed bilateral reply capability containing request ID, buyer UID, seller UID, and expiry.
- Capabilities expire after seven days and cannot be used by a third UID.
- Request and message IDs are stable deduplication keys.
- A runtime limit allows at most five send operations per UID per minute per server instance.
- Request text is not written to server logs or databases by the module.
- The provider opt-out is applied before delivery.

## Delivery and state

FCM chat payloads use a seven-day TTL and a unique collapse key, so distinct messages do not replace one another. Android uses the existing `asol_chat_v2` channel with sound and vibration. Web Push stores the complete specialty-chat metadata in AsolDB.

Accepted, received, and read are separate states:

- `acceptedUsers`: FCM/Web Push accepted at least one registered token for that provider.
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

- Push delivery is not guaranteed by FCM, Web Push, APNs, or the operating system.
- Clearing local data, signing out, uninstalling, or changing devices removes local conversation history.
- A provider without a valid enabled device token is counted as unavailable.
- APNs delivery requires the server-only Apple signing variables documented in `data-layers/14-environment-variables.md`; an unconfigured provider returns failure and is never counted as accepted.
