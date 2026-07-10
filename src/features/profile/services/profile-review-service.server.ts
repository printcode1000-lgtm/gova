import "server-only";

import { getUserByUidQuery } from "@/features/auth/operations/instances";
import type { ReviewSort } from "@/features/product/entities/product-review.entity";
import type {
  ProfileReviewsResult,
  SaveProfileReviewInput,
  UpdateProfileReviewInput,
} from "../entities/profile-review.entity";
import { profileReviewRepository } from "../repositories/profile-review-repository";
import { profileService } from "./profile-service.bootstrap.server";

function assertRating(value: number): void {
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new Error("invalidReview");
  }
}

export class ProfileReviewService {
  async list(
    targetUid: string,
    sort: ReviewSort,
    offset: number,
    limit: number,
    viewerUid: string,
  ): Promise<ProfileReviewsResult> {
    if (!targetUid) throw new Error("profileNotFound");
    const safeLimit = Math.min(20, Math.max(1, limit));
    const safeOffset = Math.max(0, offset);
    const summaryRows = await profileReviewRepository.summary(targetUid);
    const counts = new Map(
      summaryRows.map((row) => [Number(row.rating), Number(row.count)]),
    );
    const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
    const weighted = [...counts.entries()].reduce(
      (sum, [rating, count]) => sum + rating * count,
      0,
    );
    const reviews = await profileReviewRepository.list(
      targetUid,
      sort,
      safeOffset,
      safeLimit,
      viewerUid,
    );
    return {
      average: total ? weighted / total : 0,
      total,
      distribution: [5, 4, 3, 2, 1].map((rating) => ({
        rating,
        count: counts.get(rating) ?? 0,
        percentage: total ? ((counts.get(rating) ?? 0) / total) * 100 : 0,
      })),
      reviews,
      offset: safeOffset,
      limit: safeLimit,
      hasMore: safeOffset + reviews.length < total,
      currentUserReview: viewerUid
        ? await profileReviewRepository.findByUser(targetUid, viewerUid)
        : null,
    };
  }

  async create(input: SaveProfileReviewInput) {
    assertRating(input.rating);
    if (!input.targetUid || !input.uid) throw new Error("userNotFound");
    if (input.targetUid === input.uid) throw new Error("sellerCannotReview");
    const settings = (await profileService.getStoreDetails(input.targetUid))
      .ratingSettings;
    if (!settings.enabled) throw new Error("reviewsDisabled");
    if (await profileReviewRepository.findByUser(input.targetUid, input.uid)) {
      throw new Error("reviewAlreadyExists");
    }
    const user = await getUserByUidQuery.execute(input.uid);
    if (!user) throw new Error("userNotFound");
    const name = user.email?.trim() || user.phone || user.uid;
    const avatarUrl = await profileService
      .getStoreImages(input.uid)
      .then((images) => images.avatarUrl)
      .catch(() => null);
    return profileReviewRepository.create(
      input.targetUid,
      input.uid,
      name,
      avatarUrl,
      input.rating,
      settings.mode === "stars-comments"
        ? input.comment.trim().slice(0, 5000)
        : "",
    );
  }

  async update(input: UpdateProfileReviewInput) {
    assertRating(input.rating);
    const review = await profileReviewRepository.findById(
      input.reviewId,
      input.uid,
    );
    if (!review) throw new Error("reviewNotFound");
    if (review.uid !== input.uid) throw new Error("reviewForbidden");
    const settings = (await profileService.getStoreDetails(review.targetUid))
      .ratingSettings;
    return profileReviewRepository.update(
      input.reviewId,
      input.uid,
      input.rating,
      settings.mode === "stars-comments"
        ? input.comment.trim().slice(0, 5000)
        : "",
    );
  }

  async delete(reviewId: string, uid: string): Promise<void> {
    const review = await profileReviewRepository.findById(reviewId, uid);
    if (!review) throw new Error("reviewNotFound");
    if (review.uid !== uid) throw new Error("reviewForbidden");
    await profileReviewRepository.delete(reviewId, uid);
  }

  async helpful(reviewId: string, uid: string) {
    if (!uid) throw new Error("userNotFound");
    const review = await profileReviewRepository.findById(reviewId, uid);
    if (!review) throw new Error("reviewNotFound");
    return profileReviewRepository.toggleHelpful(reviewId, uid);
  }

  async saveReply(reviewId: string, uid: string, text: string) {
    const review = await profileReviewRepository.findById(reviewId, uid);
    if (!review) throw new Error("reviewNotFound");
    if (review.targetUid !== uid) throw new Error("reviewForbidden");
    const normalized = text.trim().slice(0, 5000);
    if (!normalized) throw new Error("invalidReview");
    return profileReviewRepository.saveReply(reviewId, uid, normalized);
  }

  async deleteReply(reviewId: string, uid: string): Promise<void> {
    const review = await profileReviewRepository.findById(reviewId, uid);
    if (!review) throw new Error("reviewNotFound");
    if (review.targetUid !== uid) throw new Error("reviewForbidden");
    await profileReviewRepository.deleteReply(reviewId, uid);
  }
}

export const profileReviewService = new ProfileReviewService();
