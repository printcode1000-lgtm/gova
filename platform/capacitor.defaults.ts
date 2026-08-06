/**
 * Capacitor platform defaults — not imported by application layers.
 * Used by scripts/cap-build.ts only.
 */
export const CAPACITOR_API_BASE_URL = 'https://gova-swart.vercel.app';

/**
 * Notifications service origin baked into native and static bundles.
 *
 * A native shell has no same-origin fallback: without an absolute URL the
 * browser bridge silently delivers nothing, and push stops working on the phone
 * with no error anywhere. `build-static.ts` resolves this, asserts it is
 * absolute, and exports it as `NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL` before the
 * build — which is why the runtime config needs no fallback of its own.
 */
export const CAPACITOR_NOTIFICATIONS_BASE_URL = 'https://asol-notifications.vercel.app';

/**
 * Products service origin baked into native and static bundles.
 *
 * Same failure mode as the notifications origin: without an absolute URL the
 * browser bridge falls back to the main app, which no longer serves product
 * reads once the split is live.
 */
export const CAPACITOR_PRODUCTS_BASE_URL = 'https://asol-products.vercel.app';

/**
 * Orders service origin baked into native and static bundles.
 *
 * Same failure mode as the others: without an absolute URL the browser bridge
 * falls back to the main app, which still serves the order list — so this one
 * degrades rather than breaks, but silently loses the isolation it was set up
 * for.
 */
export const CAPACITOR_ORDERS_BASE_URL = 'https://asol-orders.vercel.app';
