export type RecoveryRequestResult =
  | { status: 'sent'; maskedEmail: string; expiresInSeconds: number }
  | { status: 'contactAdmin' }
  | { status: 'accepted' };

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
  phone: string;
  code: string;
}

export interface RecoveryResetInput {
  phone: string;
  resetToken: string;
  password: string;
  confirmPassword: string;
}
