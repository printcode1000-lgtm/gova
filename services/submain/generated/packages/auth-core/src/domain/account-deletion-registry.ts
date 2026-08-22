export const ACCOUNT_DELETION_REGISTRY_VERSION = 1;

export type AccountDeletionDatabase =
  | 'users'
  | 'profiles'
  | 'products'
  | 'notifications'
  | 'orders';

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

export type DeletionTableAction =
  | 'delete_rows'
  | 'anonymize_columns'
  | 'nullify_reference'
  | 'cascade_on_parent_delete';

export interface DeletionTableRegistryEntry {
  database: AccountDeletionDatabase;
  table: string;
  action: DeletionTableAction;
  step: AccountDeletionStepId;
  columns?: string[];
  parentTable?: string;
  notes?: string;
}

export interface DeletionImageSource {
  id: string;
  step: 'collect_images';
  description: string;
}

export interface DeletionRegistryExemptTable {
  database: AccountDeletionDatabase;
  table: string;
  reason: string;
}

/** Ordered orchestration steps executed by AccountDeletionService. */
export const ACCOUNT_DELETION_STEPS = ACCOUNT_DELETION_STEP_ORDER;

/**
 * Authoritative manifest of every table touched during account deletion.
 * Update this file whenever migrations add user-owned data.
 */
export const ACCOUNT_DELETION_TABLE_REGISTRY: DeletionTableRegistryEntry[] = [
  // products
  {
    database: 'products',
    table: 'pharmacy_profile_product_overrides',
    action: 'delete_rows',
    step: 'delete_products',
    columns: ['uid'],
  },
  {
    database: 'products',
    table: 'pharmacy_profile_subcategory_overrides',
    action: 'delete_rows',
    step: 'delete_products',
    columns: ['uid'],
  },
  {
    database: 'products',
    table: 'pharmacy_profile_category_overrides',
    action: 'delete_rows',
    step: 'delete_products',
    columns: ['uid'],
  },
  {
    database: 'products',
    table: 'product_review_helpful',
    action: 'delete_rows',
    step: 'delete_products',
    columns: ['uid'],
  },
  {
    database: 'products',
    table: 'product_review_replies',
    action: 'delete_rows',
    step: 'delete_products',
    columns: ['seller_uid'],
  },
  {
    database: 'products',
    table: 'product_reviews',
    action: 'delete_rows',
    step: 'delete_products',
    columns: ['uid'],
  },
  {
    database: 'products',
    table: 'products',
    action: 'delete_rows',
    step: 'delete_products',
    columns: ['uid'],
  },

  // profile — explicit deletes
  {
    database: 'profiles',
    table: 'seller_discount_usages',
    action: 'anonymize_columns',
    step: 'delete_profile',
    columns: ['buyer_uid'],
    notes: 'Buyer references anonymized before seller discounts are removed.',
  },
  {
    database: 'profiles',
    table: 'seller_discounts',
    action: 'delete_rows',
    step: 'delete_profile',
    columns: ['seller_uid'],
  },
  {
    database: 'profiles',
    table: 'profile_review_helpful',
    action: 'delete_rows',
    step: 'delete_profile',
    columns: ['uid'],
  },
  {
    database: 'profiles',
    table: 'profile_review_replies',
    action: 'delete_rows',
    step: 'delete_profile',
    columns: ['seller_uid'],
  },
  {
    database: 'profiles',
    table: 'profile_reviews',
    action: 'delete_rows',
    step: 'delete_profile',
    columns: ['uid', 'target_uid'],
  },
  {
    database: 'profiles',
    table: 'follows',
    action: 'delete_rows',
    step: 'delete_profile',
    columns: ['follower_uid', 'target_owner_uid', 'target_id'],
  },
  {
    database: 'profiles',
    table: 'profile_delivery_carriers',
    action: 'delete_rows',
    step: 'delete_profile',
    columns: ['carrier_uid', 'seller_uid'],
  },
  {
    database: 'profiles',
    table: 'user_specialties',
    action: 'delete_rows',
    step: 'delete_profile',
    columns: ['uid'],
    notes: 'No FK to user_profiles; must be deleted explicitly.',
  },
  {
    database: 'profiles',
    table: 'user_profiles',
    action: 'delete_rows',
    step: 'delete_profile',
    columns: ['uid'],
  },

  // profile — cascade when user_profiles is deleted
  {
    database: 'profiles',
    table: 'profile_contact_points',
    action: 'cascade_on_parent_delete',
    step: 'delete_profile',
    parentTable: 'user_profiles',
  },
  {
    database: 'profiles',
    table: 'profile_locations',
    action: 'cascade_on_parent_delete',
    step: 'delete_profile',
    parentTable: 'user_profiles',
  },
  {
    database: 'profiles',
    table: 'profile_images',
    action: 'cascade_on_parent_delete',
    step: 'delete_profile',
    parentTable: 'user_profiles',
  },
  {
    database: 'profiles',
    table: 'profile_featured_products',
    action: 'cascade_on_parent_delete',
    step: 'delete_profile',
    parentTable: 'user_profiles',
  },
  {
    database: 'profiles',
    table: 'profile_trending_items',
    action: 'cascade_on_parent_delete',
    step: 'delete_profile',
    parentTable: 'user_profiles',
  },
  {
    database: 'profiles',
    table: 'profile_working_hours',
    action: 'cascade_on_parent_delete',
    step: 'delete_profile',
    parentTable: 'user_profiles',
  },
  {
    database: 'profiles',
    table: 'profile_search_categories',
    action: 'cascade_on_parent_delete',
    step: 'delete_profile',
    parentTable: 'user_profiles',
  },
  {
    database: 'profiles',
    table: 'profile_category_product_counts',
    action: 'cascade_on_parent_delete',
    step: 'delete_profile',
    parentTable: 'user_profiles',
  },

  // orders — anonymize shared records
  {
    database: 'orders',
    table: 'orders',
    action: 'anonymize_columns',
    step: 'anonymize_orders',
    columns: ['buyer_id', 'delivery_address_snapshot_json', 'notes'],
  },
  {
    database: 'orders',
    table: 'seller_orders',
    action: 'anonymize_columns',
    step: 'anonymize_orders',
    columns: ['seller_id', 'service_provider_id'],
  },
  {
    database: 'orders',
    table: 'order_items',
    action: 'anonymize_columns',
    step: 'anonymize_orders',
    columns: ['seller_id', 'product_id'],
  },
  {
    database: 'orders',
    table: 'custom_request_items',
    action: 'anonymize_columns',
    step: 'anonymize_orders',
    columns: ['seller_id', 'service_provider_id'],
  },
  {
    database: 'orders',
    table: 'custom_request_images',
    action: 'anonymize_columns',
    step: 'anonymize_orders',
    columns: ['uploaded_by', 'image_url', 'image_key', 'file_name', 'image_description'],
  },
  {
    database: 'orders',
    table: 'shipments',
    action: 'anonymize_columns',
    step: 'anonymize_orders',
    columns: ['carrier_id'],
  },
  {
    database: 'orders',
    table: 'shipment_items',
    action: 'anonymize_columns',
    step: 'anonymize_orders',
    columns: ['seller_id', 'service_provider_id'],
  },
  {
    database: 'orders',
    table: 'payments',
    action: 'anonymize_columns',
    step: 'anonymize_orders',
    columns: ['buyer_id', 'transaction_data_json'],
  },
  {
    database: 'orders',
    table: 'cancellations',
    action: 'anonymize_columns',
    step: 'anonymize_orders',
    columns: ['cancelled_by'],
  },
  {
    database: 'orders',
    table: 'return_requests',
    action: 'anonymize_columns',
    step: 'anonymize_orders',
    columns: ['buyer_id', 'carrier_id'],
  },
  {
    database: 'orders',
    table: 'replacement_requests',
    action: 'anonymize_columns',
    step: 'anonymize_orders',
    columns: ['buyer_id'],
  },
  {
    database: 'orders',
    table: 'disputes',
    action: 'anonymize_columns',
    step: 'anonymize_orders',
    columns: ['opened_by'],
  },
  {
    database: 'orders',
    table: 'dispute_messages',
    action: 'anonymize_columns',
    step: 'anonymize_orders',
    columns: ['sender_id'],
  },
  {
    database: 'orders',
    table: 'audit_trail',
    action: 'anonymize_columns',
    step: 'anonymize_orders',
    columns: ['performed_by'],
  },
  {
    database: 'orders',
    table: 'shipping_quotes',
    action: 'anonymize_columns',
    step: 'anonymize_orders',
    columns: ['seller_id', 'service_provider_id', 'buyer_id', 'proposed_by'],
  },
  {
    database: 'orders',
    table: 'delivery_plans',
    action: 'anonymize_columns',
    step: 'anonymize_orders',
    columns: ['buyer_id'],
  },
  {
    database: 'orders',
    table: 'delivery_plan_stops',
    action: 'anonymize_columns',
    step: 'anonymize_orders',
    columns: ['seller_id', 'original_carrier_id'],
  },
  {
    database: 'orders',
    table: 'delivery_plan_candidates',
    action: 'anonymize_columns',
    step: 'anonymize_orders',
    columns: ['provider_id'],
  },
  {
    database: 'orders',
    table: 'delivery_plan_candidate_stops',
    action: 'anonymize_columns',
    step: 'anonymize_orders',
    columns: ['provider_id'],
  },
  {
    database: 'orders',
    table: 'delivery_plan_quotes',
    action: 'anonymize_columns',
    step: 'anonymize_orders',
    columns: ['provider_id'],
  },

  // users / notifications
  {
    database: 'notifications',
    table: 'user_notification_tokens',
    action: 'delete_rows',
    step: 'delete_main',
    columns: ['uid'],
  },
  {
    database: 'notifications',
    table: 'user_notification_preferences',
    action: 'delete_rows',
    step: 'delete_main',
    columns: ['uid'],
  },
  {
    database: 'users',
    table: 'password_recovery_challenges',
    action: 'delete_rows',
    step: 'delete_main',
    columns: ['uid'],
  },
  {
    database: 'users',
    table: 'ota_releases',
    action: 'nullify_reference',
    step: 'delete_main',
    columns: ['approved_by_uid', 'revoked_by_uid'],
  },
  {
    database: 'users',
    table: 'ota_release_audit',
    action: 'nullify_reference',
    step: 'delete_main',
    columns: ['actor_uid'],
  },
  {
    database: 'users',
    table: 'users',
    action: 'delete_rows',
    step: 'delete_main',
    columns: ['uid'],
  },
];

export const ACCOUNT_DELETION_IMAGE_SOURCES: DeletionImageSource[] = [
  {
    id: 'profile_images',
    step: 'collect_images',
    description: 'Rows in profile_images for the deleted uid.',
  },
  {
    id: 'product_images_json',
    step: 'collect_images',
    description: 'images_json keys on products owned by the uid.',
  },
  {
    id: 'pharmacy_override_images',
    step: 'collect_images',
    description: 'Non-fixed image_key values in pharmacy_profile_product_overrides.',
  },
  {
    id: 'custom_request_images',
    step: 'collect_images',
    description: 'custom_request_images uploaded_by the uid (storage cleanup; DB row anonymized).',
  },
];

/** Tables with uid-like columns that are intentionally outside account deletion scope. */
export const ACCOUNT_DELETION_REGISTRY_EXEMPT_TABLES: DeletionRegistryExemptTable[] = [
  {
    database: 'profiles',
    table: 'system_logs',
    reason: 'Operational audit log; not user-owned account data.',
  },
  {
    database: 'profiles',
    table: 'data_health_runs',
    reason: 'Super-admin data health tooling.',
  },
  {
    database: 'profiles',
    table: 'data_health_findings',
    reason: 'Super-admin data health tooling.',
  },
  {
    database: 'profiles',
    table: 'data_health_cleanup_plans',
    reason: 'Super-admin data health tooling.',
  },
  {
    database: 'profiles',
    table: 'data_health_cleanup_audit',
    reason: 'Super-admin data health tooling.',
  },
  {
    database: 'profiles',
    table: 'data_health_quarantine',
    reason: 'Super-admin data health tooling.',
  },
  {
    database: 'profiles',
    table: 'data_health_locks',
    reason: 'Super-admin data health tooling.',
  },
  {
    database: 'profiles',
    table: 'data_health_order_purge_plans',
    reason: 'Super-admin data health tooling.',
  },
  {
    database: 'profiles',
    table: 'data_health_storage_deletion_tasks',
    reason: 'Super-admin data health tooling.',
  },
  {
    database: 'users',
    table: 'user_notification_tokens',
    reason: 'Legacy users-db migration artifact; live table is in notifications database.',
  },
  {
    database: 'users',
    table: 'user_notification_preferences',
    reason: 'Legacy users-db migration artifact; live table is in notifications database.',
  },
  {
    database: 'profiles',
    table: 'user_profiles_structured',
    reason: 'Intermediate migration table renamed to user_profiles.',
  },
  {
    database: 'users',
    table: 'feature_flags',
    reason: 'Platform configuration; no per-user rows.',
  },
  {
    database: 'users',
    table: 'specialty_requests',
    reason: 'Pre-registration intake; keyed by phone hash, not account uid.',
  },
  {
    database: 'users',
    table: 'specialty_request_preferences',
    reason: 'Pre-registration intake; keyed by phone hash, not account uid.',
  },
];

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
