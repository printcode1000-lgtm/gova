export type ReviewSort = "newest" | "highest" | "lowest";

export interface SellerReply {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}
export interface ProductReview {
  id: string;
  productId: string;
  uid: string;
  reviewerName: string;
  reviewerAvatarUrl: string | null;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  helpfulCount: number;
  isHelpful: boolean;
  createdAt: string;
  updatedAt: string;
  reply: SellerReply | null;
}
export interface RatingDistributionItem {
  rating: number;
  count: number;
  percentage: number;
}
export interface ProductReviewsResult {
  average: number;
  total: number;
  distribution: RatingDistributionItem[];
  reviews: ProductReview[];
  offset: number;
  limit: number;
  hasMore: boolean;
  currentUserReview: ProductReview | null;
}
export interface SaveReviewInput {
  productId: string;
  uid: string;
  rating: number;
  comment: string;
  styleMode?: "stars" | "stars-comments";
}
export interface UpdateReviewInput {
  reviewId: string;
  uid: string;
  rating: number;
  comment: string;
  styleMode?: "stars" | "stars-comments";
}
