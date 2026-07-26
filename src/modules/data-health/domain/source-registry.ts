export type DataHealthImageOwnership =
  | "owned"
  | "shared-snapshot"
  | "static-asset"
  | "deletion-task";

export interface DataHealthImageSourceDefinition {
  database: string;
  table: string;
  columns: readonly string[];
  ownership: DataHealthImageOwnership;
  defaultStorageProfileId?: string;
}

/**
 * Contract for persisted image-bearing sources. The data-health contract test
 * guards this registry so a new storage shape cannot silently bypass inventory.
 */
export const DATA_HEALTH_IMAGE_SOURCES = [
  {
    database: "profile",
    table: "profile_images",
    columns: ["image_key", "image_type"],
    ownership: "owned",
  },
  {
    database: "product",
    table: "products",
    columns: ["images_json"],
    ownership: "owned",
    defaultStorageProfileId: "product-default",
  },
  {
    database: "product",
    table: "product_reviews",
    columns: ["reviewer_avatar_url"],
    ownership: "shared-snapshot",
  },
  {
    database: "profile",
    table: "profile_reviews",
    columns: ["reviewer_avatar_url"],
    ownership: "shared-snapshot",
  },
  {
    database: "product",
    table: "pharmacy_profile_product_overrides",
    columns: ["image_key", "image_url"],
    ownership: "owned",
    defaultStorageProfileId: "product-default",
  },
  {
    database: "marketplace_orders",
    table: "custom_request_images",
    columns: [
      "storage_profile_id",
      "image_key",
      "image_url",
      "image_description",
    ],
    ownership: "owned",
    defaultStorageProfileId: "spicialOrder",
  },
  {
    database: "marketplace_orders",
    table: "order_items",
    columns: ["product_image_snapshot"],
    ownership: "shared-snapshot",
  },
  {
    database: "advertisements",
    table: "hero_slider",
    columns: ["config_json"],
    ownership: "owned",
    defaultStorageProfileId: "home-hero-slider",
  },
  {
    database: "static",
    table: "pharmacy_active_ingredients",
    columns: ["image_url"],
    ownership: "static-asset",
  },
  {
    database: "profile",
    table: "data_health_storage_deletion_tasks",
    columns: ["image_key", "storage_profile_id"],
    ownership: "deletion-task",
  },
] as const satisfies readonly DataHealthImageSourceDefinition[];
