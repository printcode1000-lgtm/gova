import type {
  ProductReviewsResult,
  ReviewSort,
} from '@asol/data-core/product/entities';

export interface ProfileReviewsPort {
  list(
    targetUid: string,
    sort: ReviewSort,
    offset: number,
    limit: number,
    uid: string,
  ): Promise<ProductReviewsResult>;
  create(input: {
    targetUid: string;
    uid: string;
    rating: number;
    comment: string;
  }): Promise<unknown>;
  update(input: {
    reviewId: string;
    uid: string;
    rating: number;
    comment: string;
  }): Promise<unknown>;
  delete(reviewId: string, uid: string): Promise<unknown>;
  helpful(reviewId: string, uid: string): Promise<unknown>;
  reply(reviewId: string, uid: string, text: string): Promise<unknown>;
  deleteReply(reviewId: string, uid: string): Promise<unknown>;
}

let profileReviewsPort: ProfileReviewsPort | null = null;

export function registerProfileReviewsPort(port: ProfileReviewsPort): void {
  profileReviewsPort = port;
}

export function getProfileReviewsPort(): ProfileReviewsPort {
  if (!profileReviewsPort) {
    throw new Error('ProfileReviewsPort is not registered');
  }
  return profileReviewsPort;
}
