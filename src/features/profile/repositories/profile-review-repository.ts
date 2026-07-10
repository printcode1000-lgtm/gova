import "server-only";

import { randomUUID } from "node:crypto";
import { profileDbClient } from "@/core/database/profile-db-client";
import type { ReviewSort } from "@/features/product/entities/product-review.entity";
import type { ProfileReview } from "../entities/profile-review.entity";

type Row = Record<string, any>;

function mapReview(row: Row): ProfileReview {
  return {
    id: row.id,
    targetUid: row.target_uid,
    uid: row.uid,
    reviewerName: row.reviewer_name,
    reviewerAvatarUrl: row.reviewer_avatar_url ?? null,
    rating: Number(row.rating),
    comment: row.comment,
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

export class ProfileReviewRepository {
  async findById(id: string, viewerUid = ""): Promise<ProfileReview | null> {
    const rows = (await profileDbClient.execute(
      `SELECT r.*, CASE WHEN h.uid IS NULL THEN 0 ELSE 1 END is_helpful, p.id reply_id, p.reply_text, p.created_at reply_created_at, p.updated_at reply_updated_at FROM profile_reviews r LEFT JOIN profile_review_helpful h ON h.review_id=r.id AND h.uid=? LEFT JOIN profile_review_replies p ON p.review_id=r.id WHERE r.id=? LIMIT 1`,
      [viewerUid, id],
    )) as Row[];
    return rows[0] ? mapReview(rows[0]) : null;
  }

  async findByUser(
    targetUid: string,
    uid: string,
  ): Promise<ProfileReview | null> {
    const rows = (await profileDbClient.execute(
      "SELECT id FROM profile_reviews WHERE target_uid=? AND uid=? LIMIT 1",
      [targetUid, uid],
    )) as Row[];
    return rows[0] ? this.findById(rows[0].id, uid) : null;
  }

  async list(
    targetUid: string,
    sort: ReviewSort,
    offset: number,
    limit: number,
    viewerUid: string,
  ): Promise<ProfileReview[]> {
    const order =
      sort === "highest"
        ? "r.rating DESC, r.created_at DESC"
        : sort === "lowest"
          ? "r.rating ASC, r.created_at DESC"
          : "r.created_at DESC";
    const rows = (await profileDbClient.execute(
      `SELECT r.*, CASE WHEN h.uid IS NULL THEN 0 ELSE 1 END is_helpful, p.id reply_id, p.reply_text, p.created_at reply_created_at, p.updated_at reply_updated_at FROM profile_reviews r LEFT JOIN profile_review_helpful h ON h.review_id=r.id AND h.uid=? LEFT JOIN profile_review_replies p ON p.review_id=r.id WHERE r.target_uid=? ORDER BY ${order} LIMIT ? OFFSET ?`,
      [viewerUid, targetUid, limit, offset],
    )) as Row[];
    return rows.map(mapReview);
  }

  async summary(targetUid: string): Promise<Row[]> {
    return (await profileDbClient.execute(
      "SELECT rating, COUNT(*) count FROM profile_reviews WHERE target_uid=? GROUP BY rating",
      [targetUid],
    )) as Row[];
  }

  async create(
    targetUid: string,
    uid: string,
    name: string,
    avatarUrl: string | null,
    rating: number,
    comment: string,
  ): Promise<ProfileReview | null> {
    const id = randomUUID();
    const now = new Date().toISOString();
    await profileDbClient.execute(
      "INSERT INTO profile_reviews (id,target_uid,uid,reviewer_name,reviewer_avatar_url,rating,comment,helpful_count,created_at,updated_at) VALUES (?,?,?,?,?,?,?,0,?,?)",
      [id, targetUid, uid, name, avatarUrl, rating, comment, now, now],
    );
    return this.findById(id, uid);
  }

  async update(
    id: string,
    uid: string,
    rating: number,
    comment: string,
  ): Promise<ProfileReview | null> {
    await profileDbClient.execute(
      "UPDATE profile_reviews SET rating=?, comment=?, updated_at=? WHERE id=? AND uid=?",
      [rating, comment, new Date().toISOString(), id, uid],
    );
    return this.findById(id, uid);
  }

  async delete(id: string, uid: string): Promise<void> {
    await profileDbClient.execute(
      "DELETE FROM profile_reviews WHERE id=? AND uid=?",
      [id, uid],
    );
  }

  async toggleHelpful(
    reviewId: string,
    uid: string,
  ): Promise<ProfileReview | null> {
    const rows = (await profileDbClient.execute(
      "SELECT 1 found FROM profile_review_helpful WHERE review_id=? AND uid=?",
      [reviewId, uid],
    )) as Row[];
    if (rows[0]) {
      await profileDbClient.execute(
        "DELETE FROM profile_review_helpful WHERE review_id=? AND uid=?",
        [reviewId, uid],
      );
      await profileDbClient.execute(
        "UPDATE profile_reviews SET helpful_count=MAX(0,helpful_count-1) WHERE id=?",
        [reviewId],
      );
    } else {
      await profileDbClient.execute(
        "INSERT INTO profile_review_helpful (review_id,uid,created_at) VALUES (?,?,?)",
        [reviewId, uid, new Date().toISOString()],
      );
      await profileDbClient.execute(
        "UPDATE profile_reviews SET helpful_count=helpful_count+1 WHERE id=?",
        [reviewId],
      );
    }
    return this.findById(reviewId, uid);
  }

  async saveReply(
    reviewId: string,
    sellerUid: string,
    text: string,
  ): Promise<ProfileReview | null> {
    const existing = (await profileDbClient.execute(
      "SELECT id FROM profile_review_replies WHERE review_id=?",
      [reviewId],
    )) as Row[];
    const now = new Date().toISOString();
    if (existing[0]) {
      await profileDbClient.execute(
        "UPDATE profile_review_replies SET reply_text=?,updated_at=? WHERE review_id=? AND seller_uid=?",
        [text, now, reviewId, sellerUid],
      );
    } else {
      await profileDbClient.execute(
        "INSERT INTO profile_review_replies (id,review_id,seller_uid,reply_text,created_at,updated_at) VALUES (?,?,?,?,?,?)",
        [randomUUID(), reviewId, sellerUid, text, now, now],
      );
    }
    return this.findById(reviewId, sellerUid);
  }

  async deleteReply(reviewId: string, sellerUid: string): Promise<void> {
    await profileDbClient.execute(
      "DELETE FROM profile_review_replies WHERE review_id=? AND seller_uid=?",
      [reviewId, sellerUid],
    );
  }
}

export const profileReviewRepository = new ProfileReviewRepository();
