/**
 * Ports — the one application capability `@asol/orders-core` needs but must not import.
 *
 * This package is pure order logic: statuses derived from children, prices in minor units,
 * validators, permissions, and the actor model. It reached into the application exactly once,
 * for the super-admin predicate in `actorFromInput`, and that is feature *internals* rather than
 * a designated boundary — so it is inverted rather than budgeted.
 *
 * ## Failure behaviour
 *
 * The default **fails closed**: an unregistered runtime grants nobody admin rather than granting
 * everybody. That is the only default that is safe here. A permissive default would turn a
 * forgotten registration into an authorisation hole, and the whole point of the predicate is
 * that a `role=admin` query parameter is not evidence of anything — admin status comes from the
 * uid and phone together.
 *
 * The consequence of a missing registration is therefore visible and harmless: the real
 * super-admin is treated as an ordinary actor and sees only their own orders. The contract test
 * asserts the default rather than trusting it.
 */

export interface OrdersIdentityPort {
  /**
   * Whether this uid/phone pair is the super admin.
   *
   * Both halves are required by the application's implementation; the package passes what the
   * caller supplied and never decides admin status itself.
   */
  isSuperAdminIdentity(uid: string, phone: string): boolean;
}

const FAILS_CLOSED: OrdersIdentityPort = {
  isSuperAdminIdentity: () => false,
};

let identity: OrdersIdentityPort = FAILS_CLOSED;

/**
 * Registers the application's implementations. Called by the main app's server entry and by
 * `@asol/orders-composition`, which is what the orders deployment runs — that deployment has no
 * `instrumentation.ts` of ours, so the composition is its only registration point.
 */
export function configureOrdersCore(ports: { identity?: OrdersIdentityPort }): void {
  if (ports.identity) identity = ports.identity;
}

export function resetOrdersCorePorts(): void {
  identity = FAILS_CLOSED;
}

export function ordersIdentity(): OrdersIdentityPort {
  return identity;
}
