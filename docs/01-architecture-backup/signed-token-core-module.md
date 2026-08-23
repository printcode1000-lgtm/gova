# `@asol/signed-token-core`

## Mission

The signed envelope every capability in this project travels in:
`base64url(payload).base64url(HMAC-SHA256(payload))`.

Four independent implementations existed — the session token, the notification grant, the
specialty-chat capability, and the password-recovery digests. They agreed by accident rather than
by construction, and the parts that are easy to get subtly wrong were re-derived each time.

## Door

| Door | Import | Contents |
| :--- | :--- | :--- |
| `.` | `@asol/signed-token-core` | `signEnvelope`, `verifyEnvelope`, `signaturesMatch`, `hmacDigest` |

Server-only by nature: it needs a signing secret, and a secret that reaches a browser is not a
secret. There is no `./server` door because there is no browser half.

## The secret is a callback

```ts
const ENVELOPE = {
  secret: getSessionSigningSecret,      // read at call time, never at module load
  invalidError: 'sessionTokenInvalid',
  expiredError: 'sessionTokenExpired',
};
```

Passing a function rather than a value keeps the package free of every configuration module, lets
each caller hold its own key, and avoids reading an environment variable at import time — which is
what made two other packages' doors unopenable in tests.

## Rejection order is part of the contract

1. **Signature**, before anything else. Parsing first would run `JSON.parse` on attacker-controlled
   bytes.
2. **Shape**, via the caller's `validate` callback.
3. **Expiry**, last. Reporting "expired" for an unsigned token tells a forger the rest of their
   token was otherwise acceptable.

A signed payload with no `expiresAt` is **invalid**, never valid-forever. Signing without either a
`ttlMs` or an explicit expiry throws rather than producing an eternal token.

`signaturesMatch` treats a length difference as a mismatch and returns `false`; calling
`timingSafeEqual` on different-length buffers throws, and a throw in the middle of verification is
how a comparison stops being constant-time.

## What stays with the caller

What a token *means*: how long a session lasts (30 days), what a grant authorises (one send, five
minutes), which claims make a capability usable (buyer, seller, request). Those live in
`@asol/auth-core`, `@asol/notifications-core`, and the specialty-chat feature respectively.

`hmacDigest` is the odd one out: a keyed lookup hash, not a token. Password recovery stores these
and queries by them, so the encoding is hex and stays hex.
