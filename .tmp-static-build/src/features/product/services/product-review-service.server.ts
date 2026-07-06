import "server-only";

import { getUserByUidQuery } from "@/features/auth/operations/instances";
import { profileService } from "@/features/profile/services/profile-service.bootstrap.server";
import { productRepository } from "../repositories/product-repository";
import { productReviewRepository } from "../repositories/product-review-repository";
import type {
  ProductReviewsResult,
  ReviewSort,
  SaveReviewInput,
  UpdateReviewInput,
} from "../entities/product-review.entity";

function assertRating(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 5)
    throw new Error("invalidReview");
}
function ratingSettings(
  product: Awaited<ReturnType<typeof productRepository.findById>>,
  styleMode?: "stars" | "stars-comments",
) {
  if (!product) throw new Error("productNotFound");
  const enabled = product.data.fields["rating.enabled"] !== "false";
  const targetEnabled = product.data.fields["rating.targetEnabled"] !== "false";
  const mode =
    product.data.fields["rating.mode"] === "stars" ||
    product.data.fields["rating.mode"] === "stars-comments"
      ? product.data.fields["rating.mode"]
      : (styleMode ?? "stars-comments");
  return { enabled, targetEnabled, comments: mode === "stars-comments" };
}

export class ProductReviewService {
  async list(
    productId: string,
    sort: ReviewSort,
    offset: number,
    limit: number,
    viewerUid: string,
  ): Promise<ProductReviewsResult> {
    const product = await productRepository.findById(productId);
    if (!product) throw new Error("productNotFound");
    const safeLimit = Math.min(20, Math.max(1, limit));
    const safeOffset = Math.max(0, offset);
    const summaryRows = await productReviewRepository.summary(productId);
    const counts = new Map(
      summaryRows.map((row) => [Number(row.rating), Number(row.count)]),
    );
    const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
    const weighted = [...counts.entries()].reduce(
      (sum, [rating, count]) => sum + rating * count,
      0,
    );
    const reviews = await productReviewRepository.list(
      productId,
      sort,
      safeOffset,
      safeLimit,
      viewerUid,
    );
    const distribution = [5, 4, 3, 2, 1].map((rating) => ({
      rating,
      count: counts.get(rating) ?? 0,
      percentage: total ? ((counts.get(rating) ?? 0) / total) * 100 : 0,
    }));
    return {
      average: total ? weighted / total : 0,
      total,
      distribution,
      reviews,
      offset: safeOffset,
      limit: safeLimit,
      hasMore: safeOffset + reviews.length < total,
      currentUserReview: viewerUid
        ? await productReviewRepository.findByUser(productId, viewerUid)
        : null,
    };
  }
  async create(input: SaveReviewInput) {
    assertRating(input.rating);
    const product = await productRepository.findById(input.productId);
    const settings = ratingSettings(product, input.styleMode);
    if (!settings.enabled || !settings.targetEnabled)
      throw new Error("reviewsDisabled");
    if (product!.uid === input.uid) throw new Error("sellerCannotReview");
    if (await productReviewRepository.findByUser(input.productId, input.uid))
      throw new Error("reviewAlreadyExists");
    const user = await getUserByUidQuery.execute(input.uid);
    if (!user) throw new Error("userNotFound");
    const name = user.email?.trim() || user.phone || user.uid;
    const avatarUrl = await profileService
      .getStoreImages(input.uid)
      .then((images) => images.avatarUrl)
      .catch(() => null);
    return productReviewRepository.create(
      input.productId,
      input.uid,
      name,
      avatarUrl,
      input.rating,
      settings.comments ? input.comment.trim().slice(0, 5000) : "",
    );
  }
  async update(input: UpdateReviewInput) {
    assertRating(input.rating);
    const review = await productReviewRepository.findById(
      input.reviewId,
      input.uid,
    );
    if (!review) throw new Error("reviewNotFound");
    if (review.uid !== input.uid) throw new Error("reviewForbidden");
    const product = await productRepository.findById(review.productId);
    const settings = ratingSettings(product, input.styleMode);
    return productReviewRepository.update(
      input.reviewId,
      input.uid,
      input.rating,
      settings.comments ? input.comment.trim().slice(0, 5000) : "",
    );
  }
  async delete(reviewId: string, uid: string) {
    const review = await productReviewRepository.findById(reviewId, uid);
    if (!review) throw new Error("reviewNotFound");
    if (review.uid !== uid) throw new Error("reviewForbidden");
    await productReviewRepository.delete(reviewId, uid);
  }
  async helpful(reviewId: string, uid: string) {
    if (!uid) throw new Error("userNotFound");
    const review = await productReviewRepository.findById(reviewId, uid);
    if (!review) throw new Error("reviewNotFound");
    return productReviewRepository.toggleHelpful(reviewId, uid);
  }
  async saveReply(reviewId: string, uid: string, text: string) {
    const review = await productReviewRepository.findById(reviewId, uid);
    if (!review) throw new Error("reviewNotFound");
    const product = await productRepository.findById(review.productId);
    if (!product || product.uid !== uid) throw new Error("reviewForbidden");
    const normalized = text.trim().slice(0, 5000);
    if (!normalized) throw new Error("invalidReview");
    return productReviewRepository.saveReply(reviewId, uid, normalized);
  }
  async deleteReply(reviewId: string, uid: string) {
    const review = await productReviewRepository.findById(reviewId, uid);
    if (!review) throw new Error("reviewNotFound");
    const product = await productRepository.findById(review.productId);
    if (!product || product.uid !== uid) throw new Error("reviewForbidden");
    await productReviewRepository.deleteReply(reviewId, uid);
  }
}
export const productReviewService = new ProductReviewService();
