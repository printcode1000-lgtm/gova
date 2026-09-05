export type AccountDeletionStepId =
  | 'collect_images'
  | 'anonymize_orders'
  | 'delete_products'
  | 'delete_profile'
  | 'delete_main'
  | 'delete_images';

export const ACCOUNT_DELETION_STEP_ORDER: AccountDeletionStepId[] = [
  'collect_images',
  'anonymize_orders',
  'delete_products',
  'delete_profile',
  'delete_main',
  'delete_images',
];

export const ACCOUNT_DELETION_STEPS = ACCOUNT_DELETION_STEP_ORDER;

export const ACCOUNT_DELETION_IMAGE_RETRY_DEFAULTS = {
  maxAttempts: 3,
  delayMs: 250,
} as const;

export interface FailedDeletionImage {
  profileId: string;
  key: string;
  attempts: number;
  error: string;
}

export interface DeletionImageCleanupResult {
  attempted: number;
  deleted: number;
  failed: FailedDeletionImage[];
}
