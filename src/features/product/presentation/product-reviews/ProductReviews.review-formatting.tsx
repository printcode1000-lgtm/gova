"use client";

import * as React from "react";
import { ChevronLeft, MessageSquare } from "lucide-react";
import { useSession } from "@/features/auth/ui";
import type {
  ProductReview,
  ProductReviewsResult,
  ReviewSort,
} from "@/features/product";
import { productReviewApiService } from "@/features/product/services/product-review-api-service";
import { profileApiService } from "@/features/profile/ui";

export const PAGE_SIZE = 3;

export function emptyReviewsResult(): ProductReviewsResult {
  return {
    average: 0,
    total: 0,
    distribution: [5, 4, 3, 2, 1].map((rating) => ({
      rating,
      count: 0,
      percentage: 0,
    })),
    reviews: [],
    offset: 0,
    limit: PAGE_SIZE,
    hasMore: false,
    currentUserReview: null,
  };
}

export function Stars({ value, size = "text-lg" }: { value: number; size?: string }) {
  return (
    <span className={`inline-flex ${size}`} dir="ltr">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={
            star <= Math.round(value) ? "text-amber-500" : "text-gray-300"
          }
        >
          ★
        </span>
      ))}
    </span>
  );
}

export function relativeDate(value: string) {
  const days = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 86400000),
  );
  if (days === 0) return "اليوم";
  if (days === 1) return "منذ يوم";
  return `منذ ${days} أيام`;
}
