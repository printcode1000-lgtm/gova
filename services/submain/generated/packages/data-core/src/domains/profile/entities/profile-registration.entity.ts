export interface ProfileRegistrationSnapshot {
  phone: string;
  email: string;
  providerAccountEnabled: boolean;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  phoneVerified: boolean;
}
