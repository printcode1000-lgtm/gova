import type { VerificationState } from "./index";

/**
 * The only legal challenge transitions. A challenge that is already terminal
 * (`consumed`, `expired`, `cancelled`) never moves again, so an out-of-order
 * dispatch, resend, or proof consumption is rejected instead of rewinding state.
 */
const ALLOWED_TRANSITIONS: Record<VerificationState, readonly VerificationState[]> = {
  ["created"]: [
    "dispatch_pending",
    "code_sent",
    "expired",
    "cancelled",
  ],
  ["dispatch_pending"]: [
    "dispatch_accepted",
    "dispatch_pending",
    "code_sent",
    "expired",
    "cancelled",
  ],
  ["dispatch_accepted"]: [
    "code_sent",
    "dispatch_pending",
    "expired",
    "cancelled",
  ],
  ["code_sent"]: [
    "code_sent",
    "dispatch_pending",
    "verified",
    "expired",
    "cancelled",
  ],
  ["verified"]: [
    "consumed",
    "expired",
    "cancelled",
  ],
  ["consumed"]: [],
  ["expired"]: [],
  ["cancelled"]: [],
};

export function canTransitionVerificationState(
  from: VerificationState,
  to: VerificationState,
): boolean {
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}

export function assertVerificationTransition(
  from: VerificationState,
  to: VerificationState,
): void {
  if (!canTransitionVerificationState(from, to)) {
    throw new Error("verificationChallengeStateInvalid");
  }
}
