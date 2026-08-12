import { ASOL_API_ROUTES, asolApi } from "@/core/api";
import type {
  ProductReview,
  ProductReviewsResult,
  ReviewSort,
  SaveReviewInput,
  UpdateReviewInput,
} from "../entities/product-review.entity";

export const productReviewApiService = {
  list(
    productId: string,
    sort: ReviewSort,
    offset: number,
    limit: number,
    uid: string,
  ) {
    const q = new URLSearchParams({
      productId,
      sort,
      offset: String(offset),
      limit: String(limit),
      uid,
    });
    return asolApi.get<ProductReviewsResult>(
      `${ASOL_API_ROUTES.productReviews.root}?${q}`,
      { cache: "no-store" },
    );
  },
  create(input: SaveReviewInput) {
    return asolApi.post<ProductReview>(
      ASOL_API_ROUTES.productReviews.root,
      input,
    );
  },
  update(input: UpdateReviewInput) {
    return asolApi.put<ProductReview>(
      ASOL_API_ROUTES.productReviews.root,
      input,
    );
  },
  delete(reviewId: string, uid: string) {
    const q = new URLSearchParams({ reviewId, uid });
    return asolApi.delete<{ deleted: boolean }>(
      `${ASOL_API_ROUTES.productReviews.root}?${q}`,
    );
  },
  helpful(reviewId: string, uid: string) {
    return asolApi.post<ProductReview>(ASOL_API_ROUTES.productReviews.helpful, {
      reviewId,
      uid,
    });
  },
  reply(reviewId: string, uid: string, text: string) {
    return asolApi.post<ProductReview>(ASOL_API_ROUTES.productReviews.reply, {
      reviewId,
      uid,
      text,
    });
  },
  deleteReply(reviewId: string, uid: string) {
    const q = new URLSearchParams({ reviewId, uid });
    return asolApi.delete<{ deleted: boolean }>(
      `${ASOL_API_ROUTES.productReviews.reply}?${q}`,
    );
  },
};
