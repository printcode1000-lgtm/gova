import {
  deliverNotificationGrants,
  postNotificationGrantToService,
} from '@asol/notifications-core/server';
import { getNotificationsServiceOrigin } from '@/core/config/server-env/server-env.values.auth-notifications';
import { isDevRuntime } from '@/core/config/runtime-context.server';
import { registerVerificationDispatchTransport } from '../server/ports/verification-dispatch-transport';

/**
 * Wires how a verification SMS dispatch grant leaves this runtime.
 *
 * One registrar for every runtime that serves `/api/verification/**`. That route
 * is owned by the `submain` account, not by the main app, so registering the
 * transport only in the main app's composition root left it unconfigured exactly
 * where the requests land: every Egyptian request answered
 * `verificationDispatchFailed` while `/api/health` stayed green. Both composition
 * roots now call this function, so there is one wiring source.
 *
 * Development fans out in-process against the cloud token store the development
 * runtime reads; every deployed runtime posts the signed grant to the
 * notifications deployment, the only side that holds a provider credential.
 */
export function registerVerificationDispatchTransportPort(): void {
  registerVerificationDispatchTransport({
    deliverGrant: async (grant) => {
      if (isDevRuntime()) {
        const outcome = await deliverNotificationGrants([grant]);
        return outcome.results.some(
          (entry) =>
            'results' in entry &&
            Array.isArray(entry.results) &&
            entry.results.some((recipient) =>
              ['sent', 'partial', 'queued'].includes(recipient.status),
            ),
        );
      }
      return (await postNotificationGrantToService(getNotificationsServiceOrigin(), grant))
        .delivered;
    },
  });
}
