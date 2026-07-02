import { GOVA_API_ROUTES, govaApi } from "@/core/api";
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
    return govaApi.get<ProductReviewsResult>(
      `${GOVA_API_ROUTES.productReviews.root}?${q}`,
      { cache: "no-store" },
    );
  },
  create(input: SaveReviewInput) {
    return govaApi.post<ProductReview>(
      GOVA_API_ROUTES.productReviews.root,
      input,
    );
  },
  update(input: UpdateReviewInput) {
    return govaApi.put<ProductReview>(
      GOVA_API_ROUTES.productReviews.root,
      input,
    );
  },
  delete(reviewId: string, uid: string) {
    const q = new URLSearchParams({ reviewId, uid });
    return govaApi.delete<{ deleted: boolean }>(
      `${GOVA_API_ROUTES.productReviews.root}?${q}`,
    );
  },
  helpful(reviewId: string, uid: string) {
    return govaApi.post<ProductReview>(GOVA_API_ROUTES.productReviews.helpful, {
      reviewId,
      uid,
    });
  },
  reply(reviewId: string, uid: string, text: string) {
    return govaApi.post<ProductReview>(GOVA_API_ROUTES.productReviews.reply, {
      reviewId,
      uid,
      text,
    });
  },
  deleteReply(reviewId: string, uid: string) {
    const q = new URLSearchParams({ reviewId, uid });
    return govaApi.delete<{ deleted: boolean }>(
      `${GOVA_API_ROUTES.productReviews.reply}?${q}`,
    );
  },
};
