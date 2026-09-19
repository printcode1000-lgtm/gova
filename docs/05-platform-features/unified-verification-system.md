# Unified Verification System

## Objective

The unified verification system owns one server-side challenge and proof model for registration, primary-phone changes, and password recovery. Every purpose uses the same 4-digit code length. Clients may store transient UI state, but account-changing server operations only trust a short-lived signed `verificationProof` that is bound to purpose, phone, uid, email, and channel.

## Channels

- Egyptian phone numbers route to `egypt_admin_sms`. The server creates a dispatch challenge, notifies the Super Admin's Android phone, and that device redeems the dispatch and invokes SMS Sender locally. The SMS Sender application is an external executor; it is not part of this repository.
- Non-Egyptian phone numbers route to `international_email`. The server sends a 4-digit code to the verified email address for the account or form.

## Server Flow

1. `/api/verification/request` normalizes the phone, selects the channel, applies rate limits, and creates a row in `verification_challenges`. The response carries challenge state only — no code, no dispatch ticket, no notification grant.
2. `/api/verification/verify` compares the submitted 4-digit code with the stored digest, marks the challenge verified, and returns a signed proof.
3. Protected operations call `verificationProofConsumer.consume()` before registration, primary-phone changes, or password reset. Consumption marks the challenge used, so the proof cannot be replayed.
4. `/api/verification/resend` rotates an existing challenge in place. The challenge row, its purpose and target bindings, and its rate-limit lineage are preserved; only the secret material changes — a new code for `international_email`, a new dispatch id, nonce digest, and ticket for `egypt_admin_sms`. The previous code and dispatch ticket stop being usable, `resend_count` increments, `attempts` resets, and the request is refused while the cooldown window is open or once the resend ceiling is reached.
5. `/api/verification/admin-sms/redeem` returns the SMS number, message, and signed authorization for an admin SMS dispatch request. `/api/verification/admin-sms/status` records non-sensitive dispatch status.

### Challenge state and single-use claims

`@asol/verification-core` owns the challenge state machine. `consumed`, `expired`, and `cancelled` are terminal, so an out-of-order dispatch, resend, or proof consumption is rejected rather than rewinding a challenge.

Every one-time step — verify, dispatch redemption, and proof consumption — is a conditional `UPDATE ... RETURNING id`. The caller that does not win the row is told the operation failed, so a replayed proof cannot authorize a second operation and a duplicate redemption cannot emit a second SMS carrying a code the challenge no longer stores.

## Egyptian SMS delivery

An Egyptian challenge is delivered by the Super Admin's Android phone, which is the only device running SMS Sender. The path is:

1. `/api/verification/request` (or `/resend`) creates the challenge in `dispatch_pending` with a dispatch id, a nonce digest, and a short-lived signed dispatch ticket. No code exists yet.
2. The server sends a verification dispatch notification addressed to the Super Admin account, restricted to its **Android** FCM registration. The payload is data-only and carries the event name, contract version, challenge id, dispatch id, and the dispatch ticket — no phone number, no code, no SMS body, no proof.
3. `AsolPushMessagingService` recognizes the event before notification normalization, so the signal gets no inbox record, no tray entry, and no web-layer forward, and hands it to `AsolVerificationSmsDispatch`.
4. That queues unique WorkManager work keyed by the dispatch id. Duplicate FCM deliveries collapse onto one execution; a persistent claim in `AsolVerificationSmsGateway` catches what survives a reboot or a WorkManager reset.
5. `AsolVerificationSmsWorker` claims the dispatch id, then redeems the ticket at `/api/verification/admin-sms/redeem` on the `submain` origin that owns `/api/verification/**`. It must not redeem through the main app origin and depend on an HTTP redirect, because the native worker carries a one-time POST body outside the account bridge. The server generates the code at redemption time, stores its digest, and returns the destination number, the final SMS body, the request id, and a signed send authorization.
6. The worker broadcasts explicitly to `com.hesham.smssender/.ipc.SendSmsReceiver` with `number`, `message`, `request_id`, `authorization`, and `reply_package`, then reports non-sensitive status to `/api/verification/admin-sms/status`.

No part of this requires the WebView, a notification tap, or the app being open. It runs while ASOL is backgrounded or cold-started.

### Delivery is server-owned for every requester runtime

Web, Android, and iOS requesters all take the same path: the server dispatches the notification, and no client ever receives the dispatch ticket. `runtime` is recorded for diagnostics and changes nothing about authorization.

The transport is a port, registered by `registerVerificationDispatchTransportPort()`. `/api/verification/**` is owned by the `submain` account, so the registrar must run in **every** composition root that can serve that route — `@asol/submain-composition` as well as the main application's `registerServerApplicationPorts()`. An unregistered transport fails closed with `verificationDispatchFailed`; see [the troubleshooting record](../08-troubleshooting/problems/verification-dispatch-port-unregistered-on-owner.md).

The Android gateway is configured with `SUBMAIN_BASE_URL` for the same ownership reason. A stale device preference that points at the main app origin can receive the data-only FCM signal and still fail before SMS Sender is invoked; the challenge remains `pending` with no `dispatchRedeemedAt`.

The notifications deployment answers `200` for any well-formed request and reports per-grant outcomes in the body, so the courier counts a dispatch as delivered only when a recipient reached a device (`sent`, `partial`, or `queued`). The send service accepts the dispatch without a title or body because its metadata marks it `dataOnly`; a visible notification still requires text. See [the troubleshooting record](../08-troubleshooting/problems/verification-dispatch-refused-as-contentless.md).

This deliberately differs from the original plan, which had a native requester carry the signal itself. That cannot work here: native grant delivery resolves recipient tokens and provider credentials through the requester's own authenticated session, and registration and password recovery have no session — the requester is not yet, or not currently, a signed-in user. Handing a pre-authentication client a signed dispatch ticket would also give it something it has no reason to hold. The server therefore couriers the grant to the notifications deployment itself (`postNotificationGrantToService`), or fans out locally under the development runtime.

### Recipient targeting

`SendNotificationToUsersInput.platforms` restricts a send to named device platforms, and the verification dispatch always sets `["android"]`. The field travels inside the signed grant, so no courier can widen it back to every device. A Super Admin account with no enabled Android FCM registration makes the dispatch fail with `verificationSmsGatewayUnavailable`: a retriable delivery error recorded on the challenge, never a fan-out to the iOS token and never a downgrade to the email channel.

### Duplicate suppression

Three independent guards, because sending one OTP twice is not recoverable:

- unique WorkManager work keyed by the dispatch id, with `KEEP` so a duplicate push does not restart work that may already have sent;
- a persistent claim on the device, taken before the redeem call and released only for a transport failure, so a retry keeps the same dispatch id;
- the server's redeem claim, a conditional `UPDATE ... RETURNING id`, so a second redemption is refused rather than issuing a second code.

## SMS Sender

SMS Sender lives in its own repository (`/home/hesham/sms-sender`) and is installed on the Super Admin's phone. It is **not modified by this feature**. Gova addresses its published IPC contract as-is: `com.hesham.smssender.action.SEND_SMS` with `number` and `message`, sent as an explicit component broadcast so a closed or backgrounded SMS Sender is cold-started by the system. The Android manifest declares `<package android:name="com.hesham.smssender" />`, without which Android 11+ package visibility drops the broadcast with no diagnostic.

Gova also sends `request_id`, `authorization`, and `reply_package`. The installed build ignores unknown extras, so these are inert today and become enforceable the day SMS Sender starts reading them — with no Gova change required.

### What an authenticated SMS Sender build would need

The send authorization is already shaped for it. `signSmsAuthorization` signs Ed25519 when `ASOL_VERIFICATION_SMS_SIGNING_KEY_BASE64` is configured (base64-encoded PKCS#8 PEM), so SMS Sender would embed **only the public key**: enough to prove an authorization is genuine, never enough to mint one. `verifySmsAuthorization` in `@asol/verification-core/server` is the reference check — audience, request id, destination number, and a SHA-256 digest of the exact message body, so a tampered body or a swapped destination fails before the radio is touched. With no key configured the authorization falls back to the shared-secret envelope; that is forward compatibility, not an enforcement boundary, and an unset key must not take the SMS gateway down.

Two things remain open on the SMS Sender side, tracked in that repository: local verification of the authorization, and a `com.hesham.smssender.action.SEND_RESULT` broadcast. Gova already registers `AsolVerificationSmsResultReceiver` for that action, so result reporting starts working the moment SMS Sender emits it. Until then, duplicate suppression rests on the two Gova-side guards above, and the unauthenticated external-send surface documented in SMS Sender's own `permissions-and-limitations.md` remains open by that project's current design.

## Data

`verification_challenges` lives in the users database because the affected identities and the legacy password-recovery table already live there. Codes, request IPs, dispatch nonces, and proof nonces are stored as keyed digests; raw OTP values are never persisted.

## Client Rules

- Registration and profile forms keep `verificationProof` in transient form state only.
- The profile registration card uses the same `PhoneVerification` component with `purpose="primary_phone_change"`, so changing the phone number in `/profile?mode=edit` requires the same 4-digit verification code as registration and password recovery.
- A local `phoneVerified` boolean can only drive presentation and disabled states.
- No client code may generate, compare, or transport OTPs through WhatsApp.
- Email is required by the registration and profile schemas as soon as the entered number is valid and non-Egyptian, because such a number can only be verified by email. The rule is injected into `createRegistrationSchema` / `createProfileSchema` as a `requiresEmail` predicate: the channel rule belongs to `@asol/verification-core`, which imports `@asol/auth-core` and therefore cannot be imported by it. The server enforces the same requirement independently, so a form built without the predicate can only discover the problem later, never bypass it.
- The OTP-entry panel names the destination the server actually chose — the email address for `international_email`, the phone number for `egypt_admin_sms` — so the user is not told to watch the wrong inbox.
- Changing the phone, or changing the email on an international challenge, clears the local challenge and proof and requires a new request.

## Error Codes

Every verification failure travels as a stable Business API code with a localized message under `errors.api.codes.*`. None of them reveals the code, the destination, or anything about the gateway device beyond whether the caller may retry.

| Code | Status | Meaning |
|---|---|---|
| `verificationEmailRequired` | 400 | A non-Egyptian number was submitted without a valid email. |
| `verificationCodeInvalid` | 400 | Wrong, expired, already-used, or attempt-exhausted code. Deliberately one code for all of them. |
| `verificationChallengeInvalid` | 400 | The challenge is gone, or does not match the submitted purpose/target. |
| `verificationRateLimited` | 429 | Target, IP, or resend ceiling reached. |
| `verificationResendCooldown` | 429 | Resend attempted inside the cooldown window. |
| `verificationSmsGatewayUnavailable` | 503 | No enabled Super Admin Android registration. Retriable; never a downgrade to email. |
| `verificationDispatchFailed` | 503 | The dispatch notification could not be delivered. Retriable. |
| `verificationDispatchTicketInvalid` / `verificationDispatchTicketExpired` | 400 | The native SMS gateway presented a malformed, mismatched, or expired one-time dispatch ticket. These are expected request rejections and are not persisted as `server.error` system faults. |
| `verificationDispatchUnavailable` | 400 | A duplicate, obsolete, already-redeemed, or otherwise unavailable SMS dispatch was presented. This is expected duplicate-suppression state and is not persisted as `server.error`. |
| `verificationProofRequired` / `verificationProofInvalid` / `verificationProofExpired` | 400 | A protected operation was called without a usable proof. |
| `verificationProofPurposeMismatch` / `verificationProofPhoneMismatch` / `verificationProofUidMismatch` / `verificationProofEmailMismatch` / `verificationProofChannelMismatch` | 400 | A valid proof was presented for a different protected target or action. |



## Key Files

- `packages/verification-core`: Shared channel, purpose, state-machine, signing, digest, and proof contracts, plus the SMS dispatch notification contract.
- `packages/signed-token-core`: Both envelopes — the shared-secret one, and the Ed25519 one the send authorization uses so its verifier needs no secret.
- `packages/data-core/src/domains/verification`: Challenge repository and operations.
- `src/features/verification`: API-facing server service and client API service.
- `src/features/notifications/server/services/verification-sms-dispatch.service.server.ts`: Recipient targeting and server-owned delivery of the dispatch signal.
- `packages/native-core/android/.../AsolVerificationSmsDispatch.java`, `AsolVerificationSmsWorker.java`, `AsolVerificationApi.java`, `AsolVerificationSmsGateway.java`, `AsolVerificationSmsResultReceiver.java`, `AsolVerificationSmsStatusWorker.java`, `AsolVerificationSmsPlugin.java`: the Android gateway.
- `src/features/auth/presentation/PhoneVerification.tsx`: Reusable UI component backed by server verification.

## Configuration

| Variable | Required | Meaning |
|---|---|---|
| `ASOL_VERIFICATION_SIGNING_SECRET` | No | Signs proofs, dispatch tickets, and keyed digests. At least 32 characters; falls back to the session signing secret. |
| `ASOL_VERIFICATION_SMS_SIGNING_KEY_BASE64` | No | Base64-encoded PKCS#8 PEM Ed25519 private key for the SMS send authorization. Unset means the shared-secret envelope, which the installed SMS Sender ignores either way. |

The Android gateway is told the API origin to redeem against by the web layer, through `NativeCore.configureVerificationSmsGateway()`, immediately after a successful Android push registration. Java holds no hardcoded origin, so a deployment move cannot leave the gateway calling a stale host.

## Tests

| Command | Covers |
|---|---|
| `npm run test:verification-core` | Channel routing, state machine, proof and ticket envelopes, Ed25519 send authorization, and TS↔Java dispatch-contract parity. |
| `npm run test:verification-service` | Zero dispatch for international, secret-free responses, duplicate redemption, single-use proof, resend cooldown and rotation, unavailable gateway. |
| `npm run test:phone-verification-policy` | The permanent guard that no legacy WhatsApp or client-generated OTP path returns, including the generated `public/asol-*-init.js` the browser executes. |
