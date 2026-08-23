import type { UploadedImage } from './onboarding-upload-types';

export type DocumentType = 'business_license' | 'tax_certificate' | 'id_card' | 'bank_statement';

export interface VerificationDocument {
  id: string;
  type: DocumentType;
  file: UploadedImage;
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: string;
}

export interface VerificationInfo {
  documents: VerificationDocument[];
  isVerified: boolean;
  requestedBadges: string[];
  verificationStatus: 'not_started' | 'pending' | 'verified' | 'rejected';
}
