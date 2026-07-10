import type { RatingDistributionItem, ReviewSort, SellerReply } from "@/features/product/entities/product-review.entity";

export interface ProfileReview {
  id: string;
  targetUid: string;
  uid: string;
  reviewerName: string;
  reviewerAvatarUrl: string | null;
  rating: number;
  comment: string;
  helpfulCount: number;
  isHelpful: boolean;
  createdAt: string;
  updatedAt: string;
  reply: SellerReply | null;
}

export interface ProfileReviewsResult {
  average: number;
  total: number;
  distribution: RatingDistributionItem[];
  reviews: ProfileReview[];
  offset: number;
  limit: number;
  hasMore: boolean;
  currentUserReview: ProfileReview | null;
}

export interface SaveProfileReviewInput {
  targetUid: string;
  uid: string;
  rating: number;
  comment: string;
}

export interface UpdateProfileReviewInput {
  reviewId: string;
  uid: string;
  rating: number;
  comment: string;
}

export interface ProfileRatingSettings {
  enabled: boolean;
  mode: "stars" | "stars-comments";
}
