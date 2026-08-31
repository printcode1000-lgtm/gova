import { readEnv } from "@asol/env-core";

/**
 * Operational endpoints the control runtime is allowed to reach.
 *
 * Only the notifications runtime origin lives here: it is the one allowlisted
 * cross-deployment hop, used by the unattended production-deploy terminal
 * notification. No notification database or push provider credential belongs
 * in the control runtime, so none is read here.
 */

/** Empty when no notifications runtime origin is configured. */
export function getControlNotificationsUrl(): string {
  return readEnv("ASOL_NOTIFICATIONS_URL").trim().replace(/\/+$/, "");
}
