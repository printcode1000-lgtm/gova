import { normalizePhone } from "@asol/auth-core";

export const VerificationPurposes = {
  Registration: "registration",
  PrimaryPhoneChange: "primary_phone_change",
  PasswordRecovery: "password_recovery",
} as const;

export type VerificationPurpose =
  (typeof VerificationPurposes)[keyof typeof VerificationPurposes];

export const VerificationChannels = {
  EgyptAdminSms: "egypt_admin_sms",
  InternationalEmail: "international_email",
} as const;

export type VerificationChannel =
  (typeof VerificationChannels)[keyof typeof VerificationChannels];

export const VerificationStates = {
  Created: "created",
  DispatchPending: "dispatch_pending",
  DispatchAccepted: "dispatch_accepted",
  CodeSent: "code_sent",
  Verified: "verified",
  Consumed: "consumed",
  Expired: "expired",
  Cancelled: "cancelled",
} as const;

export type VerificationState =
  (typeof VerificationStates)[keyof typeof VerificationStates];

export const VerificationClientRuntimes = {
  Web: "web",
  Android: "android",
  Ios: "ios",
} as const;

export type VerificationClientRuntime =
  (typeof VerificationClientRuntimes)[keyof typeof VerificationClientRuntimes];

export interface VerificationRequestInput {
  purpose: VerificationPurpose;
  phone: string;
  uid?: string | null;
  email?: string | null;
  runtime: VerificationClientRuntime;
}

export interface VerificationProofClaims {
  challengeId: string;
  purpose: VerificationPurpose;
  phone: string;
  uid?: string | null;
  email?: string | null;
  channel: VerificationChannel;
  nonce: string;
  issuedAt: number;
  expiresAt: number;
}

export interface VerificationDispatchTicketClaims {
  challengeId: string;
  dispatchId: string;
  nonce: string;
  issuedAt: number;
  expiresAt: number;
}

export interface VerificationSmsAuthorizationClaims {
  aud: "com.hesham.smssender.verification-sms";
  requestId: string;
  number: string;
  messageSha256: string;
  iat: number;
  exp: number;
  nonce: string;
}

export const VERIFICATION_CODE_LENGTH = 4;
export const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000;
export const VERIFICATION_PROOF_TTL_MS = 10 * 60 * 1000;
export const VERIFICATION_DISPATCH_TICKET_TTL_MS = 5 * 60 * 1000;
export const VERIFICATION_SMS_AUTH_TTL_MS = 5 * 60 * 1000;
export const VERIFICATION_MAX_CODE_ATTEMPTS = 5;
export const VERIFICATION_MAX_TARGET_REQUESTS = 3;
export const VERIFICATION_MAX_IP_REQUESTS = 10;
export const VERIFICATION_RATE_WINDOW_MS = 60 * 60 * 1000;
export const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;
export const VERIFICATION_MAX_RESENDS = 3;

export function normalizeVerificationPhone(phone: string): string {
  return normalizePhone(phone);
}

export function verificationChannelForPhone(phone: string): VerificationChannel {
  const normalized = normalizeVerificationPhone(phone);
  return normalized.startsWith("+20")
    ? VerificationChannels.EgyptAdminSms
    : VerificationChannels.InternationalEmail;
}

export function normalizeVerificationEmail(email: string | null | undefined): string | null {
  const normalized = (email ?? "").trim().toLowerCase();
  return normalized || null;
}

export function assertVerificationPurpose(value: unknown): VerificationPurpose {
  if (
    value === VerificationPurposes.Registration ||
    value === VerificationPurposes.PrimaryPhoneChange ||
    value === VerificationPurposes.PasswordRecovery
  ) {
    return value;
  }
  throw new Error("verificationPurposeInvalid");
}

export function assertVerificationRuntime(value: unknown): VerificationClientRuntime {
  if (
    value === VerificationClientRuntimes.Web ||
    value === VerificationClientRuntimes.Android ||
    value === VerificationClientRuntimes.Ios
  ) {
    return value;
  }
  throw new Error("verificationRuntimeInvalid");
}

export function assertInternationalEmail(channel: VerificationChannel, email: string | null): void {
  if (channel !== VerificationChannels.InternationalEmail) return;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("verificationEmailRequired");
  }
}

export {
  assertVerificationTransition,
  canTransitionVerificationState,
} from "./challenge-state-machine";

export {
  VERIFICATION_SMS_DISPATCH_CONTRACT_VERSION,
  VERIFICATION_SMS_DISPATCH_DATA_PREFIX,
  VERIFICATION_SMS_DISPATCH_EVENT,
  VERIFICATION_SMS_DISPATCH_METADATA_KEYS,
  VerificationDispatchStatuses,
  buildVerificationSmsDispatchMetadata,
  readVerificationSmsDispatchRequest,
  verificationSmsDispatchDataKey,
} from "./sms-dispatch-contract";
export type {
  VerificationDispatchStatus,
  VerificationSmsDispatchRequest,
} from "./sms-dispatch-contract";
