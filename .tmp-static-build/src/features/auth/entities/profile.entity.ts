export interface UserProfile {
  uid: string;
  phone: string;
  email: string | null;
}

export interface UpdateProfileInput {
  uid: string;
  phone: string;
  email: string;
  currentPassword?: string;
  newPassword?: string;
}
