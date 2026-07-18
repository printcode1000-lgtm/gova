import "server-only";
import { createHash } from "node:crypto";
import { dbClient } from "@/core/database/db-client";
import { profileDbClient } from "@/core/database/profile-db-client";
import { productDbClient } from "@/core/database/product-db-client";
import { createMarketplaceOrdersDb } from "@/modules/marketplace-orders/db/client";

export interface DeletionImage { profileId: "avatar"|"cover"|"product-default"|"spicialOrder"; key: string }

export class AccountDeletionRepository {
  async getUser(uid: string) { return (await dbClient.execute("SELECT uid, phone, password FROM users WHERE uid = ? AND deleted_at IS NULL LIMIT 1", [uid]))[0] as {uid:string;phone:string;password:string}|undefined; }

  async collectImages(uid: string): Promise<DeletionImage[]> {
    const profileRows = await profileDbClient.execute("SELECT image_key, image_type FROM profile_images WHERE uid = ?", [uid]) as {image_key:string;image_type:string}[];
    const productRows = await productDbClient.execute("SELECT images_json FROM products WHERE uid = ?", [uid]) as {images_json:string}[];
    const result: DeletionImage[] = profileRows.map((row) => ({ profileId: row.image_type === "avatar" ? "avatar" : "cover", key: row.image_key }));
    for (const row of productRows) { try { const images = JSON.parse(row.images_json) as {imageKey?:string}[]; for (const image of images) if (image.imageKey) result.push({ profileId: "product-default", key: image.imageKey }); } catch { /* malformed legacy image data must not block deletion */ } }
    const orders = createMarketplaceOrdersDb();
    const customImages = await orders.execute("SELECT image_key FROM custom_request_images WHERE uploaded_by = ?", [uid]);
    for (const row of customImages) if (typeof row.image_key === "string" && row.image_key) result.push({ profileId: "spicialOrder", key: row.image_key });
    return result;
  }

  async anonymizeOrders(uid: string): Promise<void> {
    const db = createMarketplaceOrdersDb();
    const anon = `deleted_${createHash("sha256").update(uid).digest("hex").slice(0, 24)}`;
    const ownedProducts = await productDbClient.execute("SELECT id FROM products WHERE uid = ?", [uid]);
    await db.transaction(async (tx) => {
      const replacements: [string,string][] = [
        ["orders","buyer_id"], ["seller_orders","seller_id"], ["seller_orders","service_provider_id"], ["order_items","seller_id"],
        ["custom_request_items","seller_id"], ["custom_request_items","service_provider_id"], ["custom_request_images","uploaded_by"],
        ["shipments","carrier_id"], ["shipment_items","seller_id"], ["shipment_items","service_provider_id"], ["payments","buyer_id"],
        ["cancellations","cancelled_by"], ["return_requests","buyer_id"], ["return_requests","carrier_id"], ["replacement_requests","buyer_id"],
        ["disputes","opened_by"], ["dispute_messages","sender_id"], ["audit_trail","performed_by"],
      ];
      for (const [table,column] of replacements) await tx.execute(`UPDATE ${table} SET ${column} = ? WHERE ${column} = ?`, [anon, uid]);
      await tx.execute("UPDATE orders SET delivery_address_snapshot_json = '{}', notes = NULL WHERE buyer_id = ?", [anon]);
      await tx.execute("UPDATE payments SET transaction_data_json = NULL WHERE buyer_id = ?", [anon]);
      await tx.execute("UPDATE custom_request_images SET image_url = '', image_key = ?, file_name = NULL, image_description = NULL WHERE uploaded_by = ?", [`removed-${anon}`, anon]);
      for (const row of ownedProducts) if (typeof row.id === "string") await tx.execute("UPDATE order_items SET product_id = ? WHERE product_id = ?", [`removed-${anon}`, row.id]);
    });
  }

  async deleteProducts(uid: string): Promise<void> {
    await productDbClient.execute("DELETE FROM product_review_helpful WHERE uid = ?", [uid]);
    await productDbClient.execute("DELETE FROM product_review_replies WHERE seller_uid = ?", [uid]);
    await productDbClient.execute("DELETE FROM product_reviews WHERE uid = ?", [uid]);
    await productDbClient.execute("DELETE FROM products WHERE uid = ?", [uid]);
  }

  async deleteProfile(uid: string): Promise<void> {
    await profileDbClient.execute("DELETE FROM profile_review_helpful WHERE uid = ?", [uid]);
    await profileDbClient.execute("DELETE FROM profile_review_replies WHERE seller_uid = ?", [uid]);
    await profileDbClient.execute("DELETE FROM profile_reviews WHERE uid = ? OR target_uid = ?", [uid, uid]);
    await profileDbClient.execute("DELETE FROM follows WHERE follower_uid = ? OR target_owner_uid = ? OR target_id = ?", [uid, uid, uid]);
    await profileDbClient.execute("DELETE FROM profile_delivery_carriers WHERE carrier_uid = ?", [uid]);
    await profileDbClient.execute("DELETE FROM user_profiles WHERE uid = ?", [uid]);
  }

  async deleteMain(uid: string): Promise<void> {
    await dbClient.execute("DELETE FROM user_notification_tokens WHERE uid = ?", [uid]);
    await dbClient.execute("DELETE FROM password_recovery_challenges WHERE uid = ?", [uid]);
    await dbClient.execute("UPDATE ota_releases SET approved_by_uid = NULL WHERE approved_by_uid = ?", [uid]);
    await dbClient.execute("UPDATE ota_releases SET revoked_by_uid = NULL WHERE revoked_by_uid = ?", [uid]);
    await dbClient.execute("UPDATE ota_release_audit SET actor_uid = NULL WHERE actor_uid = ?", [uid]);
    await dbClient.execute("DELETE FROM users WHERE uid = ?", [uid]);
  }
}
export const accountDeletionRepository = new AccountDeletionRepository();
