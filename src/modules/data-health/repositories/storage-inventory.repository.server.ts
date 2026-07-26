import "server-only";

import { advertisementsDbClient } from "@/core/database/advertisements-db-client";
import { productDbClient } from "@/core/database/product-db-client";
import { profileDbClient } from "@/core/database/profile-db-client";
import { buildObjectPath } from "@/core/storage/storage/image-path";
import { imageStorageOrchestrator } from "@/core/storage/storage/image-storage-orchestrator.server";
import { createMarketplaceOrdersDb } from "@/modules/marketplace-orders/db/client";

export interface StorageReference {
  storageProfileId: string;
  imageKey: string;
  objectPath: string;
  database: string;
  table: string;
  recordId: string;
  ownerUid: string;
}

export interface StorageInventory {
  references: StorageReference[];
  objectPaths: Set<string>;
  scannedRecords: number;
  warnings: string[];
}

type Row = Record<string, unknown>;

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function parseJson(value: unknown): unknown {
  try {
    return JSON.parse(text(value) || "null") as unknown;
  } catch {
    return null;
  }
}

function collectImageKeys(value: unknown, result = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectImageKeys(item, result);
    return result;
  }
  if (!value || typeof value !== "object") return result;
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (
      (key === "imageKey" || key === "image_key") &&
      typeof item === "string" &&
      item.trim()
    ) {
      result.add(item.trim());
    } else {
      collectImageKeys(item, result);
    }
  }
  return result;
}

function reference(input: Omit<StorageReference, "objectPath">): StorageReference {
  const profile = imageStorageOrchestrator.getProfile(input.storageProfileId);
  return {
    ...input,
    objectPath: buildObjectPath(profile.folder, input.imageKey),
  };
}

export class StorageInventoryRepository {
  async collect(): Promise<StorageInventory> {
    const ordersDb = createMarketplaceOrdersDb();
    const [profileImages, products, pharmacyOverrides, customImages, heroRows] =
      await Promise.all([
        profileDbClient.execute(
          "SELECT id, uid, image_key, image_type FROM profile_images",
        ) as Promise<Row[]>,
        productDbClient.execute(
          "SELECT id, uid, images_json FROM products",
        ) as Promise<Row[]>,
        productDbClient.execute(
          "SELECT id, uid, image_key FROM pharmacy_profile_product_overrides WHERE image_key IS NOT NULL AND image_key <> ''",
        ) as Promise<Row[]>,
        ordersDb.execute(
          "SELECT id, uploaded_by, storage_profile_id, image_key FROM custom_request_images",
        ),
        advertisementsDbClient.execute(
          "SELECT id, config_json FROM hero_slider",
        ) as Promise<Row[]>,
      ]);

    const references: StorageReference[] = [];
    for (const row of profileImages) {
      const imageKey = text(row.image_key);
      if (!imageKey) continue;
      references.push(
        reference({
          storageProfileId:
            text(row.image_type) === "avatar" ? "avatar" : "cover",
          imageKey,
          database: "profile",
          table: "profile_images",
          recordId: text(row.id),
          ownerUid: text(row.uid),
        }),
      );
    }

    for (const row of products) {
      const parsed = parseJson(row.images_json);
      for (const imageKey of collectImageKeys(parsed)) {
        if (imageKey.startsWith("pharmacy-fixed/")) continue;
        references.push(
          reference({
            storageProfileId: "product-default",
            imageKey,
            database: "product",
            table: "products",
            recordId: text(row.id),
            ownerUid: text(row.uid),
          }),
        );
      }
    }

    for (const row of pharmacyOverrides) {
      const imageKey = text(row.image_key);
      if (!imageKey || imageKey.startsWith("pharmacy-fixed/")) continue;
      references.push(
        reference({
          storageProfileId: "product-default",
          imageKey,
          database: "product",
          table: "pharmacy_profile_product_overrides",
          recordId: text(row.id),
          ownerUid: text(row.uid),
        }),
      );
    }

    for (const row of customImages) {
      const imageKey = text(row.image_key);
      if (!imageKey) continue;
      references.push(
        reference({
          storageProfileId: text(row.storage_profile_id) || "spicialOrder",
          imageKey,
          database: "marketplace_orders",
          table: "custom_request_images",
          recordId: text(row.id),
          ownerUid: text(row.uploaded_by),
        }),
      );
    }

    for (const row of heroRows) {
      for (const imageKey of collectImageKeys(parseJson(row.config_json))) {
        references.push(
          reference({
            storageProfileId: "home-hero-slider",
            imageKey,
            database: "advertisements",
            table: "hero_slider",
            recordId: text(row.id),
            ownerUid: "",
          }),
        );
      }
    }

    const objectPaths = new Set<string>();
    const warnings: string[] = [];
    for (const profileId of [
      "avatar",
      "cover",
      "product-default",
      "spicialOrder",
      "home-hero-slider",
    ]) {
      try {
        for (const objectPath of await imageStorageOrchestrator.listByProfile(
          profileId,
        )) {
          objectPaths.add(objectPath);
        }
      } catch (error) {
        warnings.push(
          `${profileId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return {
      references,
      objectPaths,
      scannedRecords:
        profileImages.length +
        products.length +
        pharmacyOverrides.length +
        customImages.length +
        heroRows.length +
        objectPaths.size,
      warnings,
    };
  }
}

export const storageInventoryRepository = new StorageInventoryRepository();

