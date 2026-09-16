# Unified Verification + SMS Sender Integration Plan

## Purpose

Implement one secure verification system for three account-sensitive flows:

1. New account registration.
2. Primary phone-number change from the profile registration tab.
3. Forgotten-password recovery.

The system must route Egyptian numbers through the Super Admin Android phone and the installed SMS Sender app, while non-Egyptian numbers use mandatory email verification handled entirely by the server.

## Non-negotiable behavior

1. The same verification engine and security policy must serve registration, primary-phone change, and password recovery.
2. Country routing is derived from the normalized E.164 phone number. `+20` means Egypt; all other valid country codes mean international.
3. SMS Sender must never poll Gova, call Gova APIs, or receive requests directly from a Gova server.
4. For an Egyptian request initiated inside native Gova on Android or iOS, the native Gova client initiates delivery of the verification notification to the Super Admin Gova account.
5. For an Egyptian request initiated from Web Gova, the server initiates delivery of the verification notification to the Super Admin Gova account.
6. Gova on the Super Admin Android phone receives the verification notification and locally invokes SMS Sender.
7. SMS Sender sends the OTP SMS to the requested Egyptian number; successful OTP verification authorizes exactly the requested operation.
8. For non-Egyptian numbers, no Super Admin notification and no SMS Sender invocation are allowed; email is mandatory and the server owns the entire verification flow.

## Current-code baseline and gaps

- Registration and profile phone verification currently reuse `PhoneVerification` / `use-phone-verification.ts`.
- The current registration/profile OTP is generated in the client and compared in the client, and the delivery path opens WhatsApp. This must be removed as an authorization mechanism.
- The server currently trusts the client-supplied `phoneVerified` boolean during registration/profile save. That boolean must no longer constitute proof.
- Password recovery already has the strongest reusable foundation: server-generated six-digit codes, HMAC code hashes, expiry, attempt limits, request rate limits, verification, and a short-lived reset token.
- The notification subsystem already supports signed notification grants, native delivery, Web/server delivery, FCM/APNs/Web Push, persistent Android inbox handling, and per-account Android/iOS device tokens.
- `AsolPushMessagingService` already receives Android data messages while Gova is foregrounded, backgrounded, or cold-started.
- `user_notification_tokens` already stores `device_id`, `platform`, and provider data, with one token per user/platform. The verification dispatch must target only the Super Admin Android token.
- SMS Sender already exposes `com.hesham.smssender.action.SEND_SMS`, accepts `number` + `message`, cold-starts when needed, uses the selected SIM, logs attempts, tracks delivery, and retries transient radio failures.
- SMS Sender currently accepts requests from any installed app and has no send-result callback. Both limitations must be addressed for this integration.

## Core security invariants

- The requester device must never be trusted to assert that a phone or email was verified.
- The OTP must be generated only on a trusted server and stored only as a keyed hash.
- A plaintext OTP must never be returned by a public verification API.
- A plaintext OTP must never be embedded in a notification grant or payload that passes through the requesting Android/iOS device.
- The mobile-origin notification is a wake-up/dispatch signal only. It carries an opaque challenge identifier and a short-lived signed dispatch ticket, not the OTP or destination number.
- The Super Admin Android phone redeems the dispatch ticket from Gova after receiving the notification; only then does trusted native code obtain the destination number and SMS body.
- Verification proof must be purpose-bound, target-bound, short-lived, single-use, and consumed atomically by the operation it authorizes.
- Replayed notifications, duplicated FCM delivery, duplicated broadcasts, and repeated worker execution must never send the same OTP twice.
- No OTP, reset token, dispatch secret, email verification code, or full SMS body may be written to application/system logs.
- Existing rate-limit behavior must be preserved and expanded to all three verification purposes.

## Target architecture

Create a single verification capability rather than three independent implementations.

Recommended ownership:

- `@asol/verification-core`: verification domain/application contracts, challenge state machine, purpose/channel rules, proof validation contracts, signed dispatch-ticket contracts, and policy constants.
- `@asol/data-core/verification`: cloud persistence operations for verification challenges and dispatch state.
- `src/features/verification`: application adapters, API client, server service, notification integration, and presentation-facing orchestration.
- `@asol/native-core`: Android-only Super Admin notification-to-SMS bridge capability; no feature/domain policy belongs here.
- Existing `@asol/notifications-core` + account bridge: notification transport and targeted Super Admin Android delivery.
- Existing auth/profile/password-recovery modules: consumers of verification proofs only; they must not generate or validate OTPs independently.
- SMS Sender repository: local SMS execution endpoint plus authorization, deduplication, and result reporting.

Do not add verification logic directly to unrelated notification, profile, or UI files. Keep one responsibility per file and expose package functionality only through declared package exports.

## Verification domain model

Define these purposes:

- `registration`
- `primary_phone_change`
- `password_recovery`

Define these delivery channels:

- `egypt_admin_sms`
- `international_email`

Recommended challenge states:

- `created`
- `dispatch_pending`
- `dispatch_accepted`
- `code_sent`
- `verified`
- `consumed`
- `expired`
- `cancelled`

A challenge must bind: challenge id, purpose, normalized target phone, optional account uid, required email when international, channel, code hash, expiry, failed-attempt count, resend count, dispatch nonce/id, verified timestamp, consumed timestamp, and audit timestamps.

For pre-registration challenges, the challenge exists before a user uid exists. For profile changes and password recovery, bind the challenge to the existing uid when the user is known.

## Persistence and schema plan

Add a cloud-only verification schema; do not introduce SQLite, local SQL, Drizzle, or any local database fallback.

Recommended table: `verification_challenges`.

Required fields should cover:

- `id`, `purpose`, `channel`, `uid` nullable, and normalized `phone_e164`.
- `email` nullable and required by policy for `international_email`.
- `code_hash`, `expires_at`, `attempts`, `resend_count`, `created_at`, `updated_at`.
- `verified_at`, `consumed_at`, `cancelled_at`.
- `dispatch_id`, `dispatch_nonce_hash`, `dispatch_expires_at`, `dispatch_redeemed_at`.
- `dispatch_status` and last non-sensitive failure code for diagnostics.
- Requester IP/device throttling hashes where required by the existing password-recovery policy.

Add indexes for active challenge lookup by normalized phone + purpose, uid + purpose, expiry cleanup, and unique dispatch id.

Reuse the project provisioning SSOT and schema-sync flow. Add repository contract tests and schema parity tests. No runtime CREATE/ALTER statements outside the provisioning path.

## Public verification API

Introduce a narrow API surface instead of exposing implementation-specific registration/profile/password routes to OTP internals.

Recommended endpoints:

- `POST /api/verification/request`
- `POST /api/verification/verify`
- `POST /api/verification/resend`
- `POST /api/verification/admin-sms/redeem`
- `POST /api/verification/admin-sms/status`

`request` accepts purpose, target phone, the purpose-specific identity context, optional email, and client runtime (`web`, `android`, `ios`). Runtime selection affects dispatch ownership only; it must never affect authorization correctness.

`request` behavior:

- Normalize/validate phone with the existing auth-core phone model.
- Determine channel solely from E.164: `+20` -> `egypt_admin_sms`; otherwise -> `international_email`.
- For international requests, reject missing/invalid email before creating a challenge.
- Generate a cryptographically secure six-digit OTP on the server.
- Store only a keyed hash of the OTP.
- Apply rate limits by target, IP, uid when present, and resend window.
- Return challenge metadata only. Never return the OTP.

`verify` behavior:

- Validate challenge id, purpose, target binding, expiry, state, and attempt limit.
- Compare the code using a timing-safe keyed-hash comparison.
- On success, mark the challenge verified and issue a short-lived signed `verificationProof`.
- Proof claims must include challenge id, purpose, normalized phone, uid when applicable, email/channel binding where applicable, issue time, expiry, and a unique nonce.
- The proof is not the final operation. Registration/profile/password-reset servers must validate and consume it atomically.

`resend` must rotate the OTP/hash and dispatch id, invalidate the prior code, retain challenge lineage, enforce cooldown/rate limits, and preserve the same routing rules.

## Egyptian flow: native Gova requester (Android or iOS)

1. User starts registration, primary-phone change, or password recovery in native Gova.
2. Native/web layer calls `POST /api/verification/request` with the purpose and target data.
3. Server creates the challenge and OTP, stores only the hash, and creates a short-lived signed notification grant addressed to the Super Admin Android device.
4. The notification grant contains only a verification-dispatch event, challenge id, dispatch id, and opaque signed dispatch ticket. It must not contain the OTP, destination phone, SMS body, or a redeemable verification proof.
5. The API response returns the challenge id plus the signed notification grant and marks dispatch ownership as `native`.
6. Existing native notification-grant delivery is invoked by the requester Gova app.
7. Recipient-token resolution must restrict this verification grant to the Super Admin account's Android token, not the iOS token and not arbitrary recipients.
8. The requester's app sends the provider push through the existing native notification bridge.
9. Delivery failure may be surfaced to the UI as a retriable dispatch failure, but must not expose sensitive data.
10. A server-side timeout/fallback policy may mark the dispatch stalled, but must not silently switch to an international/email route for an Egyptian number.

Security requirement: the requester native app participates only in transporting an opaque wake-up grant. It must never receive enough information to learn the OTP without possession of the destination phone.

## Egyptian flow: Web Gova requester

1. Web client calls `POST /api/verification/request`.
2. Server creates the same challenge and OTP using the same verification-core policy.
3. The server, not the browser, immediately dispatches the verification notification to the Super Admin Android device through the existing trusted notification-service path.
4. No notification grant requiring browser delivery is returned to the Web client.
5. The Web client receives only challenge state needed to render the OTP-entry UI.
6. From the Super Admin phone onward, the path is identical to the native-requester flow.

This path must not depend on the browser remaining open after the request is accepted.

## Super Admin Android receive-and-dispatch path

1. `AsolPushMessagingService` receives a data-only verification dispatch notification even when Gova is backgrounded or cold-started.
2. Existing inbox persistence remains intact for normal notification behavior.
3. Verification-dispatch events are additionally handed to a dedicated native verification SMS dispatch component.
4. Do not depend on the WebView, JavaScript lifecycle, or the Super Admin opening/tapping the notification.
5. Enqueue a unique WorkManager job keyed by `dispatch_id` so duplicate FCM deliveries collapse into one local execution.
6. The worker redeems the opaque dispatch ticket against `POST /api/verification/admin-sms/redeem`.
7. Server validates signature, audience, expiry, challenge state, dispatch id, and replay state before returning the SMS work item.
8. The redeemed work item contains destination E.164 number, final localized SMS body containing the OTP, request id, and a short-lived server-signed SMS authorization token.
9. Native Gova sends an explicit broadcast to `com.hesham.smssender/.ipc.SendSmsReceiver` with `number`, `message`, `request_id`, `authorization`, and `reply_package=hgh.asol.app`.
10. SMS Sender validates the authorization and deduplication state before accepting the send.
11. Gova records only non-sensitive dispatch status; it never stores the plaintext OTP in its native logs.

## SMS Sender integration changes

Extend the existing IPC contract instead of creating a network client inside SMS Sender.

Required send extras:

- `number`: final destination E.164 phone.
- `message`: final SMS body.
- `request_id`: stable unique dispatch id.
- `authorization`: short-lived server-signed token authorizing this exact send.
- `reply_package`: expected callback package, fixed to Gova in production.

Authorization token claims should bind audience, request id, normalized destination, message digest, issued-at, expiry, and nonce. SMS Sender should embed only the verification public key and validate signatures locally; no Gova/server secret belongs in SMS Sender.

Before sending, SMS Sender must verify that the supplied number and message hash match the signed claims. Invalid, expired, tampered, or replayed tickets are rejected and logged without message/OTP disclosure.

Persist processed `request_id` values in SMS Sender's private storage so duplicate broadcasts, WorkManager retries, or duplicate push delivery cannot create duplicate SMS sends.
Add a targeted result broadcast, for example `com.hesham.smssender.action.SEND_RESULT`, carrying only `request_id`, normalized status, non-sensitive error code, and delivery state when available.

Gova Android registers a receiver for that result and reports status to `POST /api/verification/admin-sms/status`. Status reporting is for observability/retry control only; OTP validity remains server-owned.

Preserve existing selected-SIM behavior, foreground-service execution, delivery tracking, and transient WorkManager retry.

Production acceptance must also close the current unrestricted IPC surface. The existing unauthenticated external-send path must not remain capable of sending arbitrary SMS. Server-signed per-message authorization is the preferred enforcement because it does not depend on Gova and SMS Sender sharing the same Android signing certificate.

Update SMS Sender documentation and listener tests to the new authenticated IPC contract.

## Registration integration

- Replace client-side OTP generation and WhatsApp delivery in `use-phone-verification.ts` with calls to the unified verification API.
- Preserve `PhoneVerification` as presentation where practical, but remove all authority from local `generatedOtp` and `phoneVerified` state.
- For Egyptian numbers, email remains optional unless another product rule requires it.
- For international numbers, the registration schema/UI must make email required before `request` can succeed.
- After `verify`, store the returned short-lived `verificationProof` in transient form state only.
- Registration API must require the proof, validate `purpose=registration`, verify the target phone/email bindings, and consume the challenge in the same trusted operation that creates the account.
- Remove server reliance on the client boolean `phoneVerified`; a forged `phoneVerified: true` must be useless.
- Do not auto-login until account creation has successfully consumed the proof.

## Legacy WhatsApp verification removal and anti-regression guard

The cutover is not complete while any obsolete WhatsApp OTP implementation remains in executable production code. Remove the legacy verification transport completely rather than leaving a dormant fallback.

Required cleanup:

- Delete `sendWhatsappVerificationCode` and all `window.open(wa.me/...)` OTP behavior from the phone-verification flow.
- Delete client OTP generation/state such as `generateOtp`, `generatedOtp`, and any client-side OTP comparison used as verification authority.
- Remove the legacy `window.sendWhatsappVerificationCode` bootstrap helper from `src/shared/app-init/build-app-init-script.ts` if no non-verification consumer exists.
- Remove `auth.wa_msg_template` / `wa_msg_template` locale entries when no remaining legitimate consumer exists.
- Remove obsolete WhatsApp-verification tests, mocks, comments, documentation, imports, and dead branches after their replacement tests are active.
- Do not remove unrelated product WhatsApp/contact functionality; the cleanup target is WhatsApp as an authentication/verification transport only.

Add a dedicated verification anti-regression test/guard that scans production auth/bootstrap sources and fails if any forbidden legacy verification signature returns, including `sendWhatsappVerificationCode`, `wa_msg_template`, `generatedOtp`, or a `wa.me` OTP transport. The same guard must assert that registration/profile verification cannot generate or validate an OTP locally and that protected server operations cannot accept `phoneVerified` as authority.

Add this guard to the normal relevant test suite and CI/documented verification commands so it runs automatically, not only during this migration. Its purpose is to make reintroducing the old WhatsApp/client-generated OTP path a failing change.

## Primary phone-change integration

- Continue detecting a changed phone against the saved baseline in `use-profile-registration.ts`.
- A changed phone must start a `primary_phone_change` challenge; unchanged phone requires no new challenge.
- The old phone remains authoritative in the user record and session until proof consumption succeeds.
- For an Egyptian new number, use the Super Admin SMS route.
- For an international new number, require a valid email and use server-owned email verification only.
- Profile save must submit a `verificationProof`, not a boolean.
- Server profile update must validate `purpose=primary_phone_change`, bind the proof to the authenticated uid and exact new normalized phone, and consume it atomically with the phone update.
- If the phone update fails because of uniqueness/conflict, the proof must not be reusable for a different number or account.
- Refresh the signed session only after the new phone becomes authoritative, because the session identity includes the phone.

## Password-recovery integration

- Preserve the existing strong password-recovery rate limits, code TTL, attempt limits, timing-safe comparison, and reset-token semantics.
- Move challenge creation/verification into the unified verification capability so it no longer has a separate code lifecycle.
- Egyptian account phone: dispatch through the Super Admin Android Gova -> SMS Sender route.
- International account phone: require/use the account's stored valid email; no notification or SMS Sender activity is allowed.
- Existing international accounts without a usable email must fail closed to the existing support/contact-admin recovery path until an approved account-recovery policy is defined.
- After OTP/email-code verification, issue a purpose-bound recovery proof/reset token and preserve the current password-strength and confirmation checks.
- Password reset consumes the verified challenge exactly once.

## International-number flow

For any valid non-`+20` phone number:

1. `request` selects `international_email` before any notification work is created.
2. Email is mandatory and validated server-side.
3. Server creates the challenge/code and sends the verification email itself.
4. The API response contains no notification grant, SMS dispatch ticket, or SMS Sender data.
5. The notification subsystem is not called for this challenge.
6. The Super Admin account/device is not involved.
7. SMS Sender is not invoked.
8. Verification and proof consumption follow the same purpose-bound rules as the Egyptian flow.

Add tests that explicitly assert zero notification grants and zero SMS-dispatch records for every international verification purpose.

## Verification notification contract

Introduce a dedicated notification event/category for verification SMS dispatch, separate from ordinary user-visible notifications.

Minimum payload visible to the requesting native app:

- event type, e.g. `verification_sms_dispatch_requested`.
- opaque `challenge_id`.
- opaque `dispatch_id`.
- short-lived signed `dispatch_ticket` intended only for the Super Admin Android bridge.
- non-sensitive route/category/version metadata needed by the notification system.

Do not include phone, OTP, SMS body, email, verification proof, or password-recovery reset token in this payload.
Targeting rules:

- Recipient uid is always the configured Super Admin uid.
- Recipient platform must be `android` for verification SMS dispatch.
- Do not fan out this event to the Super Admin iOS token.
- If no enabled Super Admin Android token exists, mark dispatch unavailable and return a retriable verification-delivery error without exposing the OTP.
- Existing one-token-per-user/platform cardinality is sufficient for the first implementation; if that rule changes later, verification dispatch must introduce an explicit gateway-device selector instead of broadcasting to all Android devices.

## Android native bridge design

Add one narrow native capability to `@asol/native-core`, for example `VerificationSmsBridge`.

Responsibilities:

- Recognize only the dedicated verification dispatch event.
- Enqueue/de-duplicate a background job by dispatch id.
- Redeem the dispatch ticket from the Gova API.
- Invoke SMS Sender with an explicit component intent.
- Receive SMS Sender result callbacks.
- Report non-sensitive status back to Gova.

Non-responsibilities:

- No OTP generation or validation.
- No account/business policy.
- No notification recipient selection.
- No direct database access.
- No arbitrary SMS text creation.
- No reliance on a running WebView.

## Data migration strategy

Use the existing `users` Turso database as the first home of `verification_challenges`, because the current `password_recovery_challenges` table and account identities already live there.

Migration sequence:

1. Add `verification_challenges` to `packages/data-core/src/provisioning/desired-schema/users.ts` and the matching verification repository/operations.
2. Provision/verify the cloud schema through the existing schema-sync tooling.
3. Switch new password-recovery requests to the unified table while preserving the old table only for challenges created before the cutover.
4. Because the current recovery-code TTL is ten minutes, wait until every pre-cutover challenge is guaranteed expired before removing the old read path.
5. Remove `password_recovery_challenges`, its repositories, and its indexes from code/schema ownership; execute the controlled cloud removal through the project's provisioning/migration policy.
6. Do not leave a permanent compatibility layer between the old and new challenge models.

If implementation can be coordinated during a controlled maintenance window with no active recovery challenges, skip the temporary read bridge and perform a direct cutover.

## Expected Gova code areas

Existing areas to refactor/integrate include:

- `src/features/auth/application/hooks/use-phone-verification.ts`
- `src/features/auth/presentation/PhoneVerification.tsx`
- `src/features/auth/presentation/hooks/use-register.ts`
- `packages/auth-core/src/validation/auth-schemas.ts`
- `packages/auth-core/src/server/auth-operations-service.ts`
- `src/features/auth/presentation/hooks/use-profile-registration.ts`
- `src/features/profile/server/services/profile-service.server.ts`
- `src/features/password-recovery/server/services/password-recovery-service.server.ts`
- `src/features/password-recovery/application/*` and presentation hook/page as needed.
- `src/features/notifications/*` notification grant issuance/delivery boundaries.
- `packages/account-bridge/src/mobile-push/deliver.ts` and grant-delivery contracts.
- `packages/notifications-core` only where a platform-targeted grant/recipient contract belongs to the notification capability.
- `packages/native-core/android/src/main/java/hgh/asol/app/AsolPushMessagingService.java`
- New Android native bridge/worker/result-receiver files under `packages/native-core/android/...`, each with one responsibility.
- `android/app/src/main/AndroidManifest.xml` only for required receiver/service/work integration declarations.
- `packages/data-core/src/provisioning/desired-schema/users.ts` and new verification-domain operations/repositories.
- New API handlers under a verification-owned route namespace.

New package creation must follow the package registry, exports, layer, and architecture documentation. Do not deep-import implementation files from a package.

## Expected SMS Sender code areas

Likely changes include:

- `app/src/main/java/com/hesham/smssender/ipc/SendSmsReceiver.kt`
- New signed-authorization verifier owned by a dedicated package/class.
- New processed-request-id persistence owned separately from message logging.
- New result broadcast contract and helper.
- `SmsSendService` / coordinator only where request id and result propagation are required.
- Manifest receiver declarations/permissions as required.
- `docs/ipc-api.md`, `docs/permissions-and-limitations.md`, `docs/architecture.md`, `docs/build-and-test.md`, and related tests/listener app.

Do not add any HTTP client, server polling, FCM, or Gova account logic to SMS Sender.

## UI behavior

Registration/profile/recovery should share one presentation model for challenge state where practical.

Required states:

- idle / target editing.
- requesting code.
- dispatch pending.
- code sent / code entry.
- verifying.
- verified.
- resend cooldown.
- recoverable delivery failure.
- terminal policy failure.

For international numbers, surface email as required immediately after country/phone normalization determines that the number is non-Egyptian.

For Egyptian numbers, do not require email solely for verification.

Changing the phone after a challenge starts invalidates local challenge/proof state and requires a new request.

Changing the email for an international challenge invalidates local challenge/proof state and requires a new request.

Never display the generated OTP in development UI unless an existing explicit development-only bypass contract authorizes it; production and normal development flows should exercise the real challenge path.

## Failure and retry policy

- No Super Admin Android push token: return/record `smsGatewayUnavailable`; do not expose OTP and do not fall back to email for an Egyptian number.
- Push delivery failure from native requester: allow resend/dispatch retry within rate limits without generating uncontrolled duplicate SMS.
- Super Admin phone offline: WorkManager/push delivery retries may resume later; challenge expiry remains authoritative.
- SMS Sender missing: Gova native bridge records `smsSenderUnavailable` and reports status.
- `SEND_SMS` permission missing: SMS Sender rejects with a stable non-sensitive code; Gova reports gateway configuration failure.
- No active/selected SIM: SMS Sender follows its existing fallback/retry policy; do not change verification semantics.
- Transient radio/no-service failure: existing SMS Sender durable retry remains active, but retries must preserve the same `request_id`.
- Duplicate FCM, duplicate worker, duplicate broadcast: deduplicate by dispatch/request id before sending.
- Expired challenge before send: redeem endpoint rejects and no SMS is sent.
- Expired challenge after SMS is sent: code verification fails as expired; resend creates a new code/dispatch.
- Wrong code: increment attempts and fail without revealing whether the target account exists in recovery flows.
- Max attempts/rate limit: terminate or cool down according to verification policy.
- Server status reporting failure after SMS send must not trigger a second SMS automatically; SMS Sender's local dedupe remains the final duplicate-send guard.

## Observability

Use structured, non-sensitive events keyed by challenge id/dispatch id/purpose/channel/status. Never log plaintext OTP, message body, reset/proof token, dispatch authorization, email code, or full provider token.

## Test matrix

Automated and device tests must cover all combinations below.

### Registration

- Egypt + Android native requester -> native notification grant -> Super Admin Android -> SMS Sender -> OTP verify -> account created.
- Egypt + iOS native requester -> native notification grant -> Super Admin Android -> SMS Sender -> OTP verify -> account created.
- Egypt + Web requester -> server notification dispatch -> Super Admin Android -> SMS Sender -> OTP verify -> account created.
- International + Android/iOS/Web -> mandatory email -> server email -> verify -> account created; assert zero notification/SMS dispatch.

### Primary phone change

- Same matrix as registration.
- Old phone remains active before proof consumption.
- Forged/stale proof cannot update the phone.
- Proof for one new number cannot authorize another number.

### Password recovery

- Egypt + Android/iOS/Web requester -> same SMS gateway route -> verified reset token -> password reset.
- International -> stored mandatory email route only.
- Unknown phone response remains enumeration-safe.
- International legacy account without valid email follows the approved contact-admin failure path.

### Security and reliability

- Client-supplied `phoneVerified=true` has no effect without valid proof.
- OTP is absent from request API responses, native notification grants, browser responses, logs, and analytics.
- Tampered/expired SMS authorization is rejected by SMS Sender.
- Replayed `request_id` produces no second SMS.
- Duplicate FCM delivery produces no second SMS.
- Super Admin iOS token never receives verification SMS-dispatch events.
- SMS Sender closed/backgrounded still sends after valid Gova broadcast.
- Gova Super Admin app killed/backgrounded still processes the dispatch without opening the WebView.
- Reboot/retry behavior preserves dedupe.
- Permission denied/no SIM/no service states produce stable error status without leaking secrets.

### Runtime coverage

Explicitly verify Development, Production Web, Static `out/`, Android, and iOS.

- Web/API routes must not be assumed to exist inside static/native bundles.
- Android/iOS static clients must call the configured remote API boundary.
- Android native bridge exists only on Android and must not pollute iOS/Web bundles.
- iOS requester must still be able to originate the opaque native notification grant.
- Web requester must use server-owned dispatch and never depend on native capabilities.

## Implementation phases

### Phase 0 - Baseline and contracts

1. Run the required Context Packs for auth, notifications, password recovery, profile, native-core, and data-core targets.
2. Read module isolation, package creation/exports/layers, runtime contract, notification bridge/system, auth-core, and Android/iOS push documents.
3. Capture current relevant tests and schema state.
4. Preserve all unrelated working-tree changes.
5. Define verification purpose/channel/state/error enums and request/response contracts before implementation.

### Phase 1 - Unified verification core and persistence

1. Create `@asol/verification-core` following package-creation rules and registry ownership.
2. Add challenge policy, state machine, proof/dispatch-ticket signing contracts, and pure unit tests.
3. Add `verification_challenges` to the users cloud schema and implement data-core operations/repository.
4. Add schema/repository contract tests.
5. Provision and verify the cloud schema before routing production requests to it.

### Phase 2 - Server verification service and APIs

1. Implement server-only challenge creation, code hashing, rate limits, resend, verify, proof issuance, proof consumption, dispatch-ticket issuance, redeem, and status services.
2. Add the five verification API endpoints.
3. Implement international email delivery using the existing server mail configuration/service conventions.
4. Ensure every public response is secret-free and enumeration-safe where required.

### Phase 3 - Notification dispatch routing

1. Add a dedicated verification dispatch notification contract/event.
2. Extend notification-grant recipient resolution so this event targets only the Super Admin Android token.
3. Native Android/iOS requester path returns an opaque signed grant for existing native delivery.
4. Web requester path performs trusted server-side notification delivery before returning success.
5. Add tests proving OTP/phone/message never appear in requester-visible grants or responses.
6. Add tests proving international requests never issue notification grants.

### Phase 4 - Super Admin Android native bridge

1. Extend `AsolPushMessagingService` only to recognize/delegate the dedicated event; keep normalization/inbox behavior unchanged.
2. Add a dedicated WorkManager worker keyed by dispatch id.
3. Redeem the dispatch ticket with the server without requiring a running WebView.
4. Build the explicit SMS Sender broadcast from the redeemed work item.
5. Add a result receiver/status reporter.
6. Add Android tests for foreground/background/dead-process delivery, duplicate push, missing SMS Sender, permission failure, and retry.

### Phase 5 - SMS Sender authenticated IPC

1. Extend `SEND_SMS` contract with request id, authorization token, and reply package.
2. Add public-key verification of the server-signed per-message authorization.
3. Add persistent request-id deduplication.
4. Add targeted send-result broadcast.
5. Preserve selected-SIM, foreground service, message splitting, delivery tracking, logging, and WorkManager retry.
6. Remove arbitrary unauthenticated external sending from the production contract.
7. Update SMS Sender listener/test app and documentation.

### Phase 6 - Registration cutover

1. Replace WhatsApp/client-generated OTP logic with verification API calls.
2. Make email conditionally required for non-Egyptian phones in UI and server validation.
3. Replace `phoneVerified` authority with `verificationProof`.
4. Consume the proof inside server registration before/while creating the user.
5. Add forged-proof, wrong-purpose, wrong-phone, expired, replay, duplicate-account, and successful-flow tests.
6. Delete the legacy WhatsApp/client-generated OTP implementation and run the dedicated anti-regression guard proving no forbidden verification signature remains.

### Phase 7 - Primary phone-change cutover

1. Start a challenge only when the normalized phone differs from the saved baseline.
2. Keep old phone/session authoritative until successful proof consumption.
3. Require international email when the new number is non-Egyptian.
4. Consume a `primary_phone_change` proof atomically with the user phone update.
5. Refresh session identity only after successful update.
6. Remove all server trust in `registration.phoneVerified` for phone changes.

### Phase 8 - Password-recovery cutover

1. Route recovery challenge creation/verification through verification-core.
2. Egyptian recovery uses Super Admin SMS dispatch.
3. International recovery uses stored email only.
4. Preserve enumeration resistance, rate limits, password policy, reset-token expiry, and one-time consumption.
5. Retire the old password-recovery challenge table/path after the controlled TTL/cutover window.

### Phase 9 - Documentation, gates, and device verification

Update editable Gova documentation that owns the changed behavior, including at minimum:

- `docs/05-platform-features/auth-core-module.md`
- `docs/05-platform-features/notification-system.md`
- `docs/05-platform-features/notification-bridge-module.md`
- `docs/05-platform-features/notifications-service-module.md`
- `docs/07-mobile-and-release/capacitor/android-push-notifications.md`
- `docs/07-mobile-and-release/capacitor/ios-push-notifications.md`
- architecture/package documentation/catalog source when the new package/capability changes ownership maps.

Do not hand-edit generated docs; update their sources and run `npm run docs:generate` where required.

Minimum Gova verification commands after implementation:

- `npm run typecheck`
- `npm run architecture:check`
- `npm run docs:ci`
- relevant verification/auth/password-recovery/profile/notifications/data-core/native-core test suites.
- `npm run runtime:check:changed`
- `npm run runtime:check:dev`
- `npm run runtime:check:web`
- `npm run runtime:check:static`
- `npm run runtime:check:android`
- `npm run runtime:check:ios`
- Android R8/native notification contract checks required by the changed native surface.

Device/end-to-end verification must use the actual Super Admin Android phone with Gova + SMS Sender installed and permissioned. Test Gova and SMS Sender foreground, background, and closed, plus one device reboot case.

SMS Sender verification after its repository changes must include its existing Gradle builds/tests plus authenticated IPC, duplicate request, tampered authorization, expired authorization, result callback, selected SIM, delivery, and transient retry cases.

## Rollout order

1. Ship SMS Sender authenticated IPC support first while keeping its manual in-app send usable.
2. Install/verify that SMS Sender build on the designated Super Admin Android phone.
3. Ship Gova server verification core/schema/APIs with the new path disabled behind a narrowly scoped rollout flag if needed.
4. Ship Gova Android native bridge and verify dispatch redemption + local SMS Sender invocation.
5. Enable Egyptian password-recovery verification first as the smallest server-owned existing flow, then registration, then primary-phone change, or enable all together only after the full test matrix passes.
6. Enable international email routing and conditional email requirements concurrently with each consumer cutover.
7. After the old password-recovery challenge TTL has elapsed and rollback is no longer needed, remove the legacy challenge implementation/table.
8. Remove the obsolete client WhatsApp OTP path and any now-dead verification bypass code not explicitly required by development policy.

A rollout flag must never permit an insecure client-generated OTP fallback in production. Failure must be closed/retriable, not silently downgraded.

## Rollback strategy

Rollback may switch consumers back only to a previously secure server-owned verification implementation. Do not roll back to trusting client `phoneVerified`, client-generated OTP, or arbitrary unauthenticated SMS Sender IPC.

Keep schema additions backward-safe during the initial rollout. Delay destructive removal of the old password-recovery table until the new flow has passed production/device verification and its old challenges have expired.

## Definition of done

The work is complete only when all statements below are true:

- Registration, primary-phone change, and password recovery use the same server-owned verification challenge engine.
- `+20` routes exclusively through the Super Admin Android Gova -> SMS Sender SMS path.
- Non-`+20` routes exclusively through mandatory server-owned email verification and creates no Super Admin notification.
- Native Android/iOS requester flows initiate the opaque verification notification delivery; Web requests are dispatched by the server.
- The requester never receives or can derive the OTP from API responses or notification grants.
- Super Admin Gova processes the verification dispatch while foregrounded, backgrounded, or cold-started without requiring a notification tap/WebView execution.
- SMS Sender has no Gova network dependency and accepts only cryptographically authorized verification sends in the production external-send path.
- Duplicate push/worker/broadcast/retry execution cannot send the same OTP twice.
- A verification proof is purpose/phone/account bound, expiring, one-time, and consumed by the protected operation.
- Changing a primary phone never replaces the old phone before successful verification and atomic save.
- International registration/phone-change cannot proceed without valid email; international recovery cannot use the SMS gateway.
- Existing password-recovery anti-enumeration, rate-limit, TTL, attempt-limit, and password-policy guarantees remain intact or become stricter.
- All five Gova runtimes pass applicable checks and Android/iOS bundle boundaries remain valid.
- Gova documentation, SMS Sender documentation, architecture maps, tests, and schema sources match the final implementation.
- No executable WhatsApp OTP path, `sendWhatsappVerificationCode`, verification `wa_msg_template`, client `generatedOtp`, or client-side OTP validation remains; the permanent anti-regression guard passes and is part of the normal test/CI path.
- No SQLite/local SQL/Drizzle/better-sqlite/local database fallback is introduced anywhere by this feature.

## Explicit non-goals

- SMS Sender must not become a push client or backend service.
- Gova server must not invoke SMS Sender directly.
- iOS does not host SMS Sender; the SMS gateway endpoint is the designated Super Admin Android device.
- The design does not use IP/geolocation to decide Egypt vs international.
- The design does not use WhatsApp as an OTP transport.
- The design does not trust client booleans, UI state, or notification delivery alone as proof of verification.
