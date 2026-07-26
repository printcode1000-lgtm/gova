import "server-only";

import { randomUUID } from "node:crypto";
import { productDbClient } from "@/core/database/product-db-client";
import type {
  ProductReview,
  ReviewSort,
} from "../entities/product-review.entity";

type Row = Record<string, any>;
function mapReview(row: Row): ProductReview {
  return {
    id: row.id,
    productId: row.product_id,
    uid: row.uid,
    reviewerName: row.reviewer_name,
    reviewerAvatarUrl: row.reviewer_avatar_url ?? null,
    rating: Number(row.rating),
    comment: row.comment,
    verifiedPurchase: Boolean(row.verified_purchase),
    helpfulCount: Number(row.helpful_count),
    isHelpful: Boolean(row.is_helpful),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reply: row.reply_id
      ? {
          id: row.reply_id,
          text: row.reply_text,
          createdAt: row.reply_created_at,
          updatedAt: row.reply_updated_at,
        }
      : null,
  };
}

export class ProductReviewRepository {
  async findById(id: string, viewerUid = "") {
    const rows = (await productDbClient.execute(
      `SELECT r.*, CASE WHEN h.uid IS NULL THEN 0 ELSE 1 END is_helpful, p.id reply_id, p.reply_text, p.created_at reply_created_at, p.updated_at reply_updated_at FROM product_reviews r LEFT JOIN product_review_helpful h ON h.review_id=r.id AND h.uid=? LEFT JOIN product_review_replies p ON p.review_id=r.id WHERE r.id=? LIMIT 1`,
      [viewerUid, id],
    )) as Row[];
    return rows[0] ? mapReview(rows[0]) : null;
  }
  async findByUser(productId: string, uid: string) {
    const rows = (await productDbClient.execute(
      "SELECT id FROM product_reviews WHERE product_id=? AND uid=? LIMIT 1",
      [productId, uid],
    )) as Row[];
    return rows[0] ? this.findById(rows[0].id, uid) : null;
  }
  async list(
    productId: string,
    sort: ReviewSort,
    offset: number,
    limit: number,
    viewerUid: string,
  ) {
    const order =
      sort === "highest"
        ? "r.rating DESC, r.created_at DESC"
        : sort === "lowest"
          ? "r.rating ASC, r.created_at DESC"
          : "r.created_at DESC";
    const rows = (await productDbClient.execute(
      `SELECT r.*, CASE WHEN h.uid IS NULL THEN 0 ELSE 1 END is_helpful, p.id reply_id, p.reply_text, p.created_at reply_created_at, p.updated_at reply_updated_at FROM product_reviews r LEFT JOIN product_review_helpful h ON h.review_id=r.id AND h.uid=? LEFT JOIN product_review_replies p ON p.review_id=r.id WHERE r.product_id=? ORDER BY ${order} LIMIT ? OFFSET ?`,
      [viewerUid, productId, limit, offset],
    )) as Row[];
    return rows.map(mapReview);
  }
  async summary(productId: string) {
    return (await productDbClient.execute(
      "SELECT rating, COUNT(*) count FROM product_reviews WHERE product_id=? GROUP BY rating",
      [productId],
    )) as Row[];
  }
  async create(
    productId: string,
    uid: string,
    name: string,
    avatarUrl: string | null,
    rating: number,
    comment: string,
  ) {
    const id = randomUUID(),
      now = new Date().toISOString();
    await productDbClient.execute(
      "INSERT INTO product_reviews (id,product_id,uid,reviewer_name,reviewer_avatar_url,rating,comment,verified_purchase,helpful_count,created_at,updated_at) VALUES (?,?,?,?,?,?,?,0,0,?,?)",
      [id, productId, uid, name, avatarUrl, rating, comment, now, now],
    );
    return this.findById(id, uid);
  }
  async update(id: string, uid: string, rating: number, comment: string) {
    await productDbClient.execute(
      "UPDATE product_reviews SET rating=?, comment=?, updated_at=? WHERE id=? AND uid=?",
      [rating, comment, new Date().toISOString(), id, uid],
    );
    return this.findById(id, uid);
  }
  async delete(id: string, uid: string) {
    await productDbClient.execute(
      "DELETE FROM product_reviews WHERE id=? AND uid=?",
      [id, uid],
    );
  }
  async toggleHelpful(reviewId: string, uid: string) {
    const rows = (await productDbClient.execute(
      "SELECT 1 found FROM product_review_helpful WHERE review_id=? AND uid=?",
      [reviewId, uid],
    )) as Row[];
    if (rows[0]) {
      await productDbClient.execute(
        "DELETE FROM product_review_helpful WHERE review_id=? AND uid=?",
        [reviewId, uid],
      );
      await productDbClient.execute(
        "UPDATE product_reviews SET helpful_count=MAX(0,helpful_count-1) WHERE id=?",
        [reviewId],
      );
    } else {
      await productDbClient.execute(
        "INSERT INTO product_review_helpful (review_id,uid,created_at) VALUES (?,?,?)",
        [reviewId, uid, new Date().toISOString()],
      );
      await productDbClient.execute(
        "UPDATE product_reviews SET helpful_count=helpful_count+1 WHERE id=?",
        [reviewId],
      );
    }
    return this.findById(reviewId, uid);
  }
  async saveReply(reviewId: string, sellerUid: string, text: string) {
    const existing = (await productDbClient.execute(
      "SELECT id FROM product_review_replies WHERE review_id=?",
      [reviewId],
    )) as Row[];
    const now = new Date().toISOString();
    if (existing[0])
      await productDbClient.execute(
        "UPDATE product_review_replies SET reply_text=?,updated_at=? WHERE review_id=? AND seller_uid=?",
        [text, now, reviewId, sellerUid],
      );
    else
      await productDbClient.execute(
        "INSERT INTO product_review_replies (id,review_id,seller_uid,reply_text,created_at,updated_at) VALUES (?,?,?,?,?,?)",
        [randomUUID(), reviewId, sellerUid, text, now, now],
      );
    return this.findById(reviewId, sellerUid);
  }
  async deleteReply(reviewId: string, sellerUid: string) {
    await productDbClient.execute(
      "DELETE FROM product_review_replies WHERE review_id=? AND seller_uid=?",
      [reviewId, sellerUid],
    );
  }
}
export const productReviewRepository = new ProductReviewRepository();
