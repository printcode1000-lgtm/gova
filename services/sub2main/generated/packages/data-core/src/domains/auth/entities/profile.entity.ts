export interface UserProfile {
  uid: string;
  phone: string;
  email: string | null;
  providerAccountEnabled: boolean;
}

export interface UpdateProfileInput {
  uid: string;
  phone: string;
  email: string;
  providerAccountEnabled?: boolean;
  currentPassword?: string;
  newPassword?: string;
  sessionToken: string;
}
