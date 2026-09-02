"use client";

import { Stars } from "./ProductReviews.review-formatting";

export function ProductReviewsSummary({
  average,
  total,
  canRate,
  onScrollToReviews,
  onRate,
  id,
}: {
  average: number;
  total: number;
  canRate: boolean;
  onScrollToReviews: () => void;
  onRate: () => void;
} & { id?: string }) {
  return (
    <div id='product-presentation-product-reviews-productreviewssummary-div-1-gbu7ih' className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
      <button id='product-presentation-product-reviews-productreviewssummary-button-2-uabeng'
        type="button"
        onClick={onScrollToReviews}
        className="flex items-center gap-2"
      >
        <Stars id='product-presentation-product-reviews-productreviewssummary-stars-3-i6pc0j' value={average} />
        <strong id="product-presentation-product-reviews-productreviewssummary-strong-4-yol2gq">{average.toFixed(1)}</strong>
        <span id='product-presentation-product-reviews-productreviewssummary-text-5-parwwf' className="text-sm text-muted-foreground">({total})</span>
      </button>
      {canRate ? (
        <button id="product-presentation-product-reviews-productreviewssummary-button-6-kpgzw5"
          type="button"
          aria-label="إرسال تقييم"
          onClick={onRate}
          className="rounded-xl bg-primary px-4 py-2 font-semibold text-on-primary"
        >
          تقييم
        </button>
      ) : null}
    </div>
  );
}
