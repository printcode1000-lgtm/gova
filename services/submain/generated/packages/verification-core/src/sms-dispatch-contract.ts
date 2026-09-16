/**
 * The wake-up signal that asks the Super Admin's Android phone to send a
 * verification SMS.
 *
 * It is a dispatch signal, not the verification itself. Everything sensitive —
 * the OTP, the destination number, the SMS body — stays on the server until
 * trusted native code on that one device redeems the ticket. What travels here
 * is an opaque challenge id, an opaque dispatch id, and a short-lived signed
 * ticket that is useless without the redeem endpoint.
 *
 * The key names are the contract: the server writes them as notification
 * metadata, the provider forwards them as `meta_*` data entries, and the Android
 * bridge reads them back. `AsolVerificationSmsDispatch.java` repeats these
 * literals because Java cannot import this module; the dispatch-contract parity
 * test fails the build if the two drift.
 */

export const VERIFICATION_SMS_DISPATCH_EVENT = "verification_sms_dispatch_requested";

export const VERIFICATION_SMS_DISPATCH_CONTRACT_VERSION = 1;

/** Notification-metadata keys, as the send input carries them. */
export const VERIFICATION_SMS_DISPATCH_METADATA_KEYS = {
  event: "verificationEvent",
  version: "verificationVersion",
  challengeId: "verificationChallengeId",
  dispatchId: "verificationDispatchId",
  dispatchTicket: "verificationDispatchTicket",
} as const;

/** The prefix the FCM payload builder puts in front of every metadata key. */
export const VERIFICATION_SMS_DISPATCH_DATA_PREFIX = "meta_";

export function verificationSmsDispatchDataKey(
  key: keyof typeof VERIFICATION_SMS_DISPATCH_METADATA_KEYS,
): string {
  return `${VERIFICATION_SMS_DISPATCH_DATA_PREFIX}${VERIFICATION_SMS_DISPATCH_METADATA_KEYS[key]}`;
}

export interface VerificationSmsDispatchRequest {
  challengeId: string;
  dispatchId: string;
  dispatchTicket: string;
}

/**
 * `dataOnly` keeps the gateway phone from showing a tray entry for a machine
 * signal, and `priority` high is what wakes a dozing process — the dispatch must
 * not wait for the Super Admin to open the app.
 */
export function buildVerificationSmsDispatchMetadata(
  request: VerificationSmsDispatchRequest,
): Record<string, string | number | boolean> {
  const keys = VERIFICATION_SMS_DISPATCH_METADATA_KEYS;
  return {
    dataOnly: true,
    [keys.event]: VERIFICATION_SMS_DISPATCH_EVENT,
    [keys.version]: VERIFICATION_SMS_DISPATCH_CONTRACT_VERSION,
    [keys.challengeId]: request.challengeId,
    [keys.dispatchId]: request.dispatchId,
    [keys.dispatchTicket]: request.dispatchTicket,
  };
}

/** Reads a dispatch request out of a received data map, or `null` if this is not one. */
export function readVerificationSmsDispatchRequest(
  data: Record<string, string | undefined>,
): VerificationSmsDispatchRequest | null {
  if (data[verificationSmsDispatchDataKey("event")] !== VERIFICATION_SMS_DISPATCH_EVENT) {
    return null;
  }
  if (
    Number(data[verificationSmsDispatchDataKey("version")]) !==
    VERIFICATION_SMS_DISPATCH_CONTRACT_VERSION
  ) {
    return null;
  }
  const challengeId = data[verificationSmsDispatchDataKey("challengeId")]?.trim() ?? "";
  const dispatchId = data[verificationSmsDispatchDataKey("dispatchId")]?.trim() ?? "";
  const dispatchTicket = data[verificationSmsDispatchDataKey("dispatchTicket")]?.trim() ?? "";
  if (!challengeId || !dispatchId || !dispatchTicket) return null;
  return { challengeId, dispatchId, dispatchTicket };
}

/** The dispatch outcome the gateway device reports back; observability only. */
export const VerificationDispatchStatuses = {
  Pending: "pending",
  Redeemed: "redeemed",
  Sent: "sent",
  Failed: "failed",
  Unavailable: "unavailable",
} as const;

export type VerificationDispatchStatus =
  (typeof VerificationDispatchStatuses)[keyof typeof VerificationDispatchStatuses];
