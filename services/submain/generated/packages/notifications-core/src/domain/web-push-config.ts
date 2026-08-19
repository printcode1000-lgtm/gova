/**
 * Web Push VAPID identity.
 *
 * The public key is a constant on purpose. It is handed to every browser that
 * subscribes — it is what `applicationServerKey` is — so storing it in a
 * database row behind an authenticated API bought nothing but a round trip
 * before every subscription. As a constant it is also available to a static
 * export and to the native shell, which have no server to ask.
 *
 * The private key is a real secret and lives only in
 * `WEB_PUSH_VAPID_PRIVATE_KEY`, on the notifications account — the one
 * deployment that sends web push. It is never imported from here.
 *
 * Rotating the pair invalidates every `PushSubscription` a browser is holding:
 * the browser binds a subscription to the key it subscribed with, and a
 * mismatched sender is rejected. That is why this is a deploy and not a button
 * in an admin page — there is no safe one-click rotation to offer. Change both
 * halves together and expect every browser to re-subscribe.
 */

/** P-256 public key, base64url, 87 characters. */
export const WEB_PUSH_VAPID_PUBLIC_KEY =
  "BAnc8GnblFDUcjZVPqZzqykCmRCX80uOCobjfKUq4VjzLP1KJyFgil91hNHUy10mL1EnvqdhM6zmPam-Oqm9qh8";

/**
 * Contact for the push service, per RFC 8292. It must be an address a human
 * actually reads: this is how Google, Mozilla, or Apple reach the sender when
 * a deployment starts misbehaving before they block it.
 */
export const WEB_PUSH_VAPID_SUBJECT = "mailto:suezbazaar@gmail.com";
