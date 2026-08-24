/**
 * The seam between the application and `@asol/orders-core`.
 *
 * The package decides what an order *means* and never who is an administrator. This module is
 * the only place that knows both: it hands the package the application's super-admin predicate
 * and nothing else.
 *
 * Registration is a side effect of calling this, so it must run before the first order request.
 * `src/instrumentation.ts` does that on the main app; the orders deployment has no
 * `instrumentation.ts` of ours, so `@asol/orders-composition` registers there instead.
 *
 * If it is ever dropped, the port fails closed: the real super admin is treated as an ordinary
 * actor and sees only their own orders. Nobody is granted anything they should not have.
 */
import { configureOrdersCore } from '@asol/orders-core';

import { isSuperAdminIdentity } from '@/features/auth';

export function registerOrdersCorePorts(): void {
  configureOrdersCore({
    identity: { isSuperAdminIdentity },
  });
}
