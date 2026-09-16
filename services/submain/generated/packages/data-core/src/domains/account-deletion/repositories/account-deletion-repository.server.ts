import { notificationsDataSource, productsDataSource, profilesDataSource, usersDataSource } from "../../../core";
import "server-only";
import { createHash } from "node:crypto";
import { createMarketplaceOrdersDb } from "../../marketplace-orders/db/client";
import type { DeletionImage } from "@asol/auth-core/server";

export class AccountDeletionRepository {
  async getUser(uid: string) {
    const userRow = (await usersDataSource.execute(
      "SELECT uid, phone, password FROM users WHERE uid = ? AND deleted_at IS NULL LIMIT 1",
      [uid],
    ))[0] as { uid: string; phone: string; password: string } | undefined;
    if (userRow) return userRow;

    const profileRow = (await profilesDataSource.execute(
      "SELECT uid, primary_phone FROM user_profiles WHERE uid = ? LIMIT 1",
      [uid],
    ))[0] as { uid: string; primary_phone: string | null } | undefined;
    if (profileRow) {
      return {
        uid: profileRow.uid,
        phone: profileRow.primary_phone ?? "",
        password: "",
      };
    }

    return undefined;
  }

  async collectImages(uid: string): Promise<DeletionImage[]> {
    const profileRows = await profilesDataSource.execute(
      "SELECT image_key, image_type FROM profile_images WHERE uid = ?",
      [uid],
    ) as { image_key: string; image_type: string }[];
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

    for (const row of productRows) {
      try {
        const images = JSON.parse(row.images_json) as {
          imageKey?: string;
          storageProfileId?: string;
        }[];
        for (const image of images) {
          if (image.imageKey) {
            result.push({
              profileId:
                image.storageProfileId === "product-apparel-pets"
                  ? "product-apparel-pets"
                  : "product-default",
              key: image.imageKey,
            });
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
    const orderIds = new Set<string>();
    const collect = async (sql: string, params: unknown[]) => {
      for (const row of await db.execute(sql, params)) {
        if (typeof row.order_id === "string" && row.order_id) orderIds.add(row.order_id);
      }
    };

    // Account deletion owns the whole order whenever this uid appears as any
    // participant. This deliberately includes indirect delivery-plan roles.
    await collect("SELECT id AS order_id FROM orders WHERE buyer_id = ?", [uid]);
    await collect("SELECT order_id FROM seller_orders WHERE seller_id = ? OR service_provider_id = ?", [uid, uid]);
    await collect("SELECT order_id FROM order_items WHERE seller_id = ?", [uid]);
    await collect("SELECT order_id FROM custom_request_items WHERE seller_id = ? OR service_provider_id = ?", [uid, uid]);
    await collect("SELECT order_id FROM custom_request_images WHERE uploaded_by = ?", [uid]);
    await collect("SELECT order_id FROM shipments WHERE carrier_id = ?", [uid]);
    await collect("SELECT order_id FROM shipment_items WHERE seller_id = ? OR service_provider_id = ?", [uid, uid]);
    await collect("SELECT order_id FROM payments WHERE buyer_id = ?", [uid]);
    await collect("SELECT order_id FROM cancellations WHERE cancelled_by = ?", [uid]);
    await collect("SELECT order_id FROM return_requests WHERE buyer_id = ? OR carrier_id = ?", [uid, uid]);
    await collect("SELECT order_id FROM replacement_requests WHERE buyer_id = ?", [uid]);
    await collect("SELECT order_id FROM disputes WHERE opened_by = ?", [uid]);
    const sentDisputeIds = (await db.execute("SELECT dispute_id FROM dispute_messages WHERE sender_id = ?", [uid]))
      .map((row) => row.dispute_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    for (const disputeId of sentDisputeIds) {
      await collect("SELECT order_id FROM disputes WHERE id = ?", [disputeId]);
    }
    await collect("SELECT order_id FROM audit_trail WHERE performed_by = ?", [uid]);
    await collect("SELECT order_id FROM shipping_quotes WHERE seller_id = ? OR service_provider_id = ? OR buyer_id = ? OR proposed_by = ?", [uid, uid, uid, uid]);
    await collect("SELECT order_id FROM delivery_plans WHERE buyer_id = ?", [uid]);
    await collect("SELECT order_id FROM delivery_plan_stops WHERE seller_id = ? OR original_carrier_id = ?", [uid, uid]);
    const providerPlanIds = new Set<string>();
    for (const row of await db.execute("SELECT plan_id FROM delivery_plan_candidates WHERE provider_id = ?", [uid])) {
      if (typeof row.plan_id === "string") providerPlanIds.add(row.plan_id);
    }
    for (const row of await db.execute("SELECT plan_id FROM delivery_plan_candidate_stops WHERE provider_id = ?", [uid])) {
      if (typeof row.plan_id === "string") providerPlanIds.add(row.plan_id);
    }
    for (const planId of providerPlanIds) {
      await collect("SELECT order_id FROM delivery_plans WHERE id = ?", [planId]);
    }
    await collect("SELECT order_id FROM delivery_plan_quotes WHERE provider_id = ?", [uid]);

    // Every order-domain shard stores order_id on its owned aggregate rows.
    // Deleting leaves no order, item, shipment, payment, after-sales, dispute,
    // quote, delivery-plan or audit residue mentioning an affected order.
    for (const orderId of orderIds) {
      await db.execute("DELETE FROM dispute_messages WHERE dispute_id IN (SELECT id FROM disputes WHERE order_id = ?)", [orderId]);
      await db.execute("DELETE FROM disputes WHERE order_id = ?", [orderId]);
      await db.execute("DELETE FROM audit_trail WHERE order_id = ?", [orderId]);
      await db.execute("DELETE FROM cancellation_items WHERE cancellation_id IN (SELECT id FROM cancellations WHERE order_id = ?)", [orderId]);
      await db.execute("DELETE FROM return_request_items WHERE return_request_id IN (SELECT id FROM return_requests WHERE order_id = ?)", [orderId]);
      await db.execute("DELETE FROM replacement_request_items WHERE replacement_request_id IN (SELECT id FROM replacement_requests WHERE order_id = ?)", [orderId]);
      await db.execute("DELETE FROM cancellations WHERE order_id = ?", [orderId]);
      await db.execute("DELETE FROM return_requests WHERE order_id = ?", [orderId]);
      await db.execute("DELETE FROM replacement_requests WHERE order_id = ?", [orderId]);
      await db.execute("DELETE FROM refunds WHERE order_id = ?", [orderId]);
      await db.execute("DELETE FROM payments WHERE order_id = ?", [orderId]);
      await db.execute("DELETE FROM delivery_plan_quote_stops WHERE plan_id IN (SELECT id FROM delivery_plans WHERE order_id = ?)", [orderId]);
      await db.execute("DELETE FROM delivery_plan_shipments WHERE plan_id IN (SELECT id FROM delivery_plans WHERE order_id = ?)", [orderId]);
      await db.execute("DELETE FROM delivery_plan_candidate_stops WHERE plan_id IN (SELECT id FROM delivery_plans WHERE order_id = ?)", [orderId]);
      await db.execute("DELETE FROM delivery_plan_candidates WHERE plan_id IN (SELECT id FROM delivery_plans WHERE order_id = ?)", [orderId]);
      await db.execute("DELETE FROM delivery_plan_quotes WHERE order_id = ?", [orderId]);
      await db.execute("DELETE FROM delivery_plan_stops WHERE order_id = ?", [orderId]);
      await db.execute("DELETE FROM delivery_plans WHERE order_id = ?", [orderId]);
      await db.execute("DELETE FROM shipping_quotes WHERE order_id = ?", [orderId]);
      await db.execute("DELETE FROM shipment_items WHERE order_id = ?", [orderId]);
      await db.execute("DELETE FROM shipments WHERE order_id = ?", [orderId]);
      await db.execute("DELETE FROM custom_request_images WHERE order_id = ?", [orderId]);
      await db.execute("DELETE FROM custom_request_items WHERE order_id = ?", [orderId]);
      await db.execute("DELETE FROM order_items WHERE order_id = ?", [orderId]);
      await db.execute("DELETE FROM seller_orders WHERE order_id = ?", [orderId]);
      await db.execute("DELETE FROM orders WHERE id = ?", [orderId]);
    }
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
    await usersDataSource.execute("DELETE FROM verification_challenges WHERE uid = ?", [uid]);
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
