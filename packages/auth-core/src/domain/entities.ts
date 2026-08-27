export interface UserProfile {
  uid: string;
  phone: string;
  email: string;
}

export interface UpdateProfileInput {
  uid: string;
  phone: string;
  email: string;
  currentPassword?: string;
  newPassword?: string;
  sessionToken: string;
}

export interface LoginResult {
  uid: string;
  phone: string;
  email: string;
  specialties: ProfileSpecialtiesSelection;
  sessionToken: string;
}

export interface ProfileSpecialtiesSelection {
  main: number[];
  sub: Record<string, number[]>;
}

export interface DeleteAccountInput {
  uid: string;
  currentPassword: string;
  confirmation: string;
  sessionToken: string;
}

export interface DeleteAccountImageFailure {
  profileId: string;
  key: string;
  attempts: number;
  error: string;
}

export interface DeleteAccountResult {
  deleted: true;
  anonymizedOrderRecords: boolean;
  stepsCompleted: string[];
  imagesAttempted: number;
  imagesDeleted: number;
  imagesFailed: DeleteAccountImageFailure[];
}

export interface RegistrationInput {
  phone: string;
  password: string;
  email?: string;
  storeName?: string;
}

export interface LoginInput {
  phone: string;
  password: string;
}

export interface SignedSessionClaims {
  uid: string;
  phone: string;
  expiresAt: number;
}
