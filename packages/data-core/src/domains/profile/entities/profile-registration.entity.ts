export interface ProfileRegistrationSnapshot {
  phone: string;
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  phoneVerified: boolean;
}
