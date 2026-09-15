import type { AccountDeletionStepId } from '@asol/auth-core';

export const ACCOUNT_DELETION_REGISTRY_VERSION = 2;

export type AccountDeletionDatabase =
  | 'users'
  | 'profiles'
  | 'products'
  | 'notifications'
  | 'orders';

export type DeletionTableAction =
  | 'delete_rows'
  | 'anonymize_columns'
  | 'delete_related_orders'
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

  // orders — delete the complete aggregate if the uid is any participant.
  // Child tables are removed before their parent rows across the order shards.
  ...[
    'orders', 'seller_orders', 'order_items', 'custom_request_items',
    'custom_request_images', 'shipments', 'shipment_items', 'payments', 'refunds',
    'cancellations', 'cancellation_items', 'return_requests', 'return_request_items',
    'replacement_requests', 'replacement_request_items', 'disputes', 'dispute_messages',
    'audit_trail', 'shipping_quotes', 'delivery_plans', 'delivery_plan_stops',
    'delivery_plan_candidates', 'delivery_plan_candidate_stops', 'delivery_plan_quotes',
    'delivery_plan_quote_stops', 'delivery_plan_shipments',
  ].map((table) => ({
    database: 'orders' as const,
    table,
    action: 'delete_related_orders' as const,
    step: 'anonymize_orders' as const,
    notes: 'Delete the full order aggregate when the deleted uid participates anywhere in that order.',
  })),

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

