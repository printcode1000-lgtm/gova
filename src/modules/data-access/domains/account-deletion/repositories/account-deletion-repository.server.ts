import { notificationsDataSource, productsDataSource, profilesDataSource, usersDataSource } from "@/modules/data-access/core";
import "server-only";
import { createHash } from "node:crypto";
import { createMarketplaceOrdersDb } from "@/modules/data-access/domains/marketplace-orders/db/client";
import type { DeletionImage } from "@asol/auth-core/server";

export class AccountDeletionRepository {
  async getUser(uid: string) {
    return (await usersDataSource.execute(
      "SELECT uid, phone, password FROM users WHERE uid = ? AND deleted_at IS NULL LIMIT 1",
      [uid],
    ))[0] as { uid: string; phone: string; password: string } | undefined;
  }

  async collectImages(uid: string): Promise<DeletionImage[]> {
    const profileRows = await profilesDataSource.execute(
      "SELECT image_key, image_type FROM profile_images WHERE uid = ?",
      [uid],
    ) as { image_key: string; image_type: string }[];
    const profileKeyRows = await profilesDataSource.execute(
      "SELECT avatar_image_key, cover_image_key, cover_image_keys_json FROM user_profiles WHERE uid = ? LIMIT 1",
      [uid],
    ) as {
      avatar_image_key: string | null;
      cover_image_key: string | null;
      cover_image_keys_json: string | null;
    }[];
    const productRows = await productsDataSource.execute(
      "SELECT images_json FROM products WHERE uid = ?",
      [uid],
    ) as { images_json: string }[];
    const pharmacyRows = await productsDataSource.execute(
      "SELECT image_key FROM pharmacy_profile_product_overrides WHERE uid = ? AND image_key IS NOT NULL AND image_key != ''",
      [uid],
    ) as { image_key: string }[];

    const result: DeletionImage[] = profileRows.map((row) => ({
      profileId: row.image_type === "avatar" ? "avatar" : "cover",
      key: row.image_key,
    }));

    const profileKeys = profileKeyRows[0];
    if (profileKeys) {
      if (profileKeys.avatar_image_key) {
        result.push({ profileId: "avatar", key: profileKeys.avatar_image_key });
      }
      if (profileKeys.cover_image_key) {
        result.push({ profileId: "cover", key: profileKeys.cover_image_key });
      }
      if (profileKeys.cover_image_keys_json) {
        try {
          const keys = JSON.parse(profileKeys.cover_image_keys_json) as string[];
          for (const key of keys) {
            if (typeof key === "string" && key) {
              result.push({ profileId: "cover", key });
            }
          }
        } catch {
          // malformed legacy cover keys must not block deletion
        }
      }
    }

    for (const row of productRows) {
      try {
        const images = JSON.parse(row.images_json) as { imageKey?: string }[];
        for (const image of images) {
          if (image.imageKey) {
            result.push({ profileId: "product-default", key: image.imageKey });
          }
        }
      } catch {
        // malformed legacy image data must not block deletion
      }
    }

    for (const row of pharmacyRows) {
      if (typeof row.image_key === "string" && row.image_key && !row.image_key.startsWith("pharmacy-fixed/")) {
        result.push({ profileId: "product-default", key: row.image_key });
      }
    }

    const orders = createMarketplaceOrdersDb();
    const customImages = await orders.execute(
      "SELECT image_key FROM custom_request_images WHERE uploaded_by = ?",
      [uid],
    );
    for (const row of customImages) {
      if (typeof row.image_key === "string" && row.image_key) {
        result.push({ profileId: "spicialOrder", key: row.image_key });
      }
    }

    return result;
  }

  async anonymizeOrders(uid: string): Promise<void> {
    const db = createMarketplaceOrdersDb();
    const anon = `deleted_${createHash("sha256").update(uid).digest("hex").slice(0, 24)}`;
    const ownedProducts = await productsDataSource.execute("SELECT id FROM products WHERE uid = ?", [uid]);
    await db.transaction(async (tx) => {
      const replacements: [string, string][] = [
        ["orders", "buyer_id"],
        ["seller_orders", "seller_id"],
        ["seller_orders", "service_provider_id"],
        ["order_items", "seller_id"],
        ["custom_request_items", "seller_id"],
        ["custom_request_items", "service_provider_id"],
        ["custom_request_images", "uploaded_by"],
        ["shipments", "carrier_id"],
        ["shipment_items", "seller_id"],
        ["shipment_items", "service_provider_id"],
        ["payments", "buyer_id"],
        ["cancellations", "cancelled_by"],
        ["return_requests", "buyer_id"],
        ["return_requests", "carrier_id"],
        ["replacement_requests", "buyer_id"],
        ["disputes", "opened_by"],
        ["dispute_messages", "sender_id"],
        ["audit_trail", "performed_by"],
        ["shipping_quotes", "seller_id"],
        ["shipping_quotes", "service_provider_id"],
        ["shipping_quotes", "buyer_id"],
        ["shipping_quotes", "proposed_by"],
        ["delivery_plans", "buyer_id"],
        ["delivery_plan_stops", "seller_id"],
        ["delivery_plan_stops", "original_carrier_id"],
        ["delivery_plan_candidates", "provider_id"],
        ["delivery_plan_candidate_stops", "provider_id"],
        ["delivery_plan_quotes", "provider_id"],
      ];
      for (const [table, column] of replacements) {
        await tx.execute(`UPDATE ${table} SET ${column} = ? WHERE ${column} = ?`, [anon, uid]);
      }
      await tx.execute(
        "UPDATE orders SET delivery_address_snapshot_json = '{}', notes = NULL WHERE buyer_id = ?",
        [anon],
      );
      await tx.execute("UPDATE payments SET transaction_data_json = NULL WHERE buyer_id = ?", [anon]);
      await tx.execute(
        "UPDATE custom_request_images SET image_url = '', image_key = ?, file_name = NULL, image_description = NULL WHERE uploaded_by = ?",
        [`removed-${anon}`, anon],
      );
      for (const row of ownedProducts) {
        if (typeof row.id === "string") {
          await tx.execute("UPDATE order_items SET product_id = ? WHERE product_id = ?", [
            `removed-${anon}`,
            row.id,
          ]);
        }
      }
    });
  }

  async deleteProducts(uid: string): Promise<void> {
    await productsDataSource.execute(
      "DELETE FROM pharmacy_profile_product_overrides WHERE uid = ?",
      [uid],
    );
    await productsDataSource.execute(
      "DELETE FROM pharmacy_profile_subcategory_overrides WHERE uid = ?",
      [uid],
    );
    await productsDataSource.execute(
      "DELETE FROM pharmacy_profile_category_overrides WHERE uid = ?",
      [uid],
    );
    await productsDataSource.execute("DELETE FROM product_review_helpful WHERE uid = ?", [uid]);
    await productsDataSource.execute("DELETE FROM product_review_replies WHERE seller_uid = ?", [uid]);
    await productsDataSource.execute("DELETE FROM product_reviews WHERE uid = ?", [uid]);
    await productsDataSource.execute("DELETE FROM products WHERE uid = ?", [uid]);
  }

  async deleteProfile(uid: string): Promise<void> {
    const anon = `deleted_${createHash("sha256").update(uid).digest("hex").slice(0, 24)}`;
    await profilesDataSource.execute(
      "UPDATE seller_discount_usages SET buyer_uid = ? WHERE buyer_uid = ?",
      [anon, uid],
    );
    await profilesDataSource.execute("DELETE FROM seller_discounts WHERE seller_uid = ?", [uid]);
    await profilesDataSource.execute("DELETE FROM profile_review_helpful WHERE uid = ?", [uid]);
    await profilesDataSource.execute("DELETE FROM profile_review_replies WHERE seller_uid = ?", [uid]);
    await profilesDataSource.execute(
      "DELETE FROM profile_reviews WHERE uid = ? OR target_uid = ?",
      [uid, uid],
    );
    await profilesDataSource.execute(
      "DELETE FROM follows WHERE follower_uid = ? OR target_owner_uid = ? OR target_id = ?",
      [uid, uid, uid],
    );
    await profilesDataSource.execute(
      "DELETE FROM profile_delivery_carriers WHERE carrier_uid = ? OR seller_uid = ?",
      [uid, uid],
    );
    await profilesDataSource.execute("DELETE FROM user_specialties WHERE uid = ?", [uid]);
    await profilesDataSource.execute("DELETE FROM user_profiles WHERE uid = ?", [uid]);
  }

  async deleteNotifications(uid: string): Promise<void> {
    await notificationsDataSource.execute(
      "DELETE FROM user_notification_tokens WHERE uid = ?",
      [uid],
    );
    await notificationsDataSource.execute(
      "DELETE FROM user_notification_preferences WHERE uid = ?",
      [uid],
    );
  }

  async deleteMain(uid: string): Promise<void> {
    await this.deleteNotifications(uid);
    await usersDataSource.execute("DELETE FROM password_recovery_challenges WHERE uid = ?", [uid]);
    await usersDataSource.execute(
      "UPDATE ota_releases SET approved_by_uid = NULL WHERE approved_by_uid = ?",
      [uid],
    );
    await usersDataSource.execute(
      "UPDATE ota_releases SET revoked_by_uid = NULL WHERE revoked_by_uid = ?",
      [uid],
    );
    await usersDataSource.execute(
      "UPDATE ota_release_audit SET actor_uid = NULL WHERE actor_uid = ?",
      [uid],
    );
    await usersDataSource.execute("DELETE FROM users WHERE uid = ?", [uid]);
  }
}

export const accountDeletionRepository = new AccountDeletionRepository();
