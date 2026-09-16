export type RecoveryRequestResult =
  | { status: 'sent'; challengeId: string; maskedEmail: string; expiresInSeconds: number }
  | { status: 'contactAdmin' }
  | { status: 'accepted'; challengeId?: string };

export interface RecoveryVerifyResult {
  resetToken: string;
  expiresInSeconds: number;
}

export interface RecoveryResetResult {
  success: true;
}

export interface RecoveryRequestInput {
  phone: string;
}

export interface RecoveryVerifyInput {
  challengeId: string;
  phone: string;
  code: string;
}

export interface RecoveryResetInput {
  phone: string;
  resetToken: string;
  password: string;
  confirmPassword: string;
}
