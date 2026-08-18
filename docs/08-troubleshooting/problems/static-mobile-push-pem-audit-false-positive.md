# Static Build: Mobile Push Security Audit Flags PEM Parsing Code

## Symptoms

`npm run build:static` or `deploy:all` fails at the end of the static pipeline with:

```text
Static bundle exposes a mobile push secret (_next/static/chunks/<hash>.js).
```

The failing chunk is client-side code from the native mobile-push path (for example
`packages/account-bridge/src/mobile-push/fcm-auth.ts`), not a leaked server secret.

---

## Root Cause

`auditStaticMobilePushSecurity()` in
`packages/ota-core/src/publishing/build/out-runtime-config.ts` scans every file under
`out/_next/static/chunks/` for forbidden patterns.

An overly broad rule treated **any** occurrence of `BEGIN PRIVATE KEY` as a credential
leak. The FCM JWT signer on the device must strip PEM headers before importing the key:

```ts
e.replace(/-----BEGIN PRIVATE KEY-----/g, "")
```

That literal is **parsing boilerplate**, not a baked private key. The encrypted credential
blob (`NEXT_PUBLIC_ASOL_MOBILE_PUSH_CREDENTIAL_BLOB`) is expected in the bundle; only the
server-only unlock key and **plaintext** key material must stay out.

A similar false positive can come from comments that mention `ASOL_MOBILE_PUSH_UNLOCK_KEY`
by name — minified client chunks can include comment text from `public-env.ts`.

---

## Fix

1. **Audit patterns must target real leaks**, not PEM marker strings used in code:
   - Keep blocking `ASOL_MOBILE_PUSH_UNLOCK_KEY` (env name must not ship client-side).
   - Keep blocking a full `firebase-adminsdk@….iam.gserviceaccount.com` service-account email.
   - Block PEM only when followed by base64 key body (e.g. `-----BEGIN PRIVATE KEY-----\nMII…`),
     not the marker alone.

2. **Do not put server env var names in client-facing comments** in `src/core/config/public-env.ts`
   or other files that compile into static chunks. Prefer generic wording such as
   “server-only unlock key”.

3. **After changing audit rules**, run `npm run build:static` (or `deploy:all`) and confirm
   `Static mobile push security audit passed.` appears in the log.

---

## Prevention Checklist

| Do | Don't |
|---|---|
| Use encrypted blob + server unlock for native FCM | Bake `ASOL_MOBILE_PUSH_UNLOCK_KEY` or plaintext JSON service accounts into `out/` |
| Match audit regexes on actual secret shapes | Ban the substring `BEGIN PRIVATE KEY` globally |
| Keep PEM strip logic in `fcm-auth.ts` as-is | “Fix” audit failures by removing the mobile-push client path |
| Mention unlock key generically in client docs/comments | Repeat exact `ASOL_MOBILE_PUSH_*` names in strings that ship to the browser |

---

## Related

- `packages/ota-core/src/publishing/build/out-runtime-config.ts` — `auditStaticMobilePushSecurity()`
- `docs/05-platform-features/notification-bridge-module.md` — native credential contract
- `docs/07-mobile-and-release/capacitor/android-push-notifications.md` — outbound push from device
