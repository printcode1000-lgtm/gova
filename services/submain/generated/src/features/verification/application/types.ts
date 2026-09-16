import type {
  VerificationChannel,
  VerificationClientRuntime,
  VerificationPurpose,
} from "@asol/verification-core";

export interface VerificationRequestBody {
  purpose: VerificationPurpose;
  phone: string;
  uid?: string | null;
  email?: string | null;
  runtime: VerificationClientRuntime;
}

/**
 * What a requester is told. Deliberately secret-free: no code, no dispatch
 * ticket, no notification grant. `dispatchId` is an opaque correlation handle for
 * diagnostics, and only the Super Admin's Android phone can act on the dispatch.
 */
export interface VerificationRequestResult {
  challengeId: string;
  purpose: VerificationPurpose;
  channel: VerificationChannel;
  expiresInSeconds: number;
  dispatchId?: string;
}

export interface VerificationResendBody extends VerificationRequestBody {
  challengeId: string;
}

export interface VerificationVerifyBody {
  challengeId: string;
  purpose: VerificationPurpose;
  phone: string;
  uid?: string | null;
  email?: string | null;
  code: string;
}

export interface VerificationVerifyResult {
  verificationProof: string;
  expiresInSeconds: number;
}

export interface VerificationAdminSmsRedeemBody {
  dispatchId: string;
  dispatchTicket: string;
}

export interface VerificationAdminSmsRedeemResult {
  requestId: string;
  number: string;
  message: string;
  authorization: string;
  replyPackage: "hgh.asol.app";
}

export interface VerificationAdminSmsStatusBody {
  requestId: string;
  status: string;
  errorCode?: string | null;
  deliveryState?: string | null;
}
