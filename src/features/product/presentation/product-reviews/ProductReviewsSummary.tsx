"use client";

import { Stars } from "./ProductReviews.review-formatting";
import { uiAttributes } from "@asol/ui-registry-core";

export function ProductReviewsSummary({
  average,
  total,
  canRate,
  onScrollToReviews,
  onRate,
}: {
  average: number;
  total: number;
  canRate: boolean;
  onScrollToReviews: () => void;
  onRate: () => void;
}) {
  return (
    <div id="product.product-reviews.product-reviews-summary.div" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
      <button id="product.product-reviews.product-reviews-summary.button"
        type="button"
        onClick={onScrollToReviews}
        className="flex items-center gap-2"
      >
        <Stars id="product.product-reviews.product-reviews-summary.stars" value={average} />
        <strong>{average.toFixed(1)}</strong>
        <span id="product.product-reviews.product-reviews-summary.span" className="text-sm text-muted-foreground">({total})</span>
      </button>
      {canRate ? (
        <button {...uiAttributes({ uid: "product-review-GBBl45", id: "product-review", kind: "action", interaction: { type: "tap" }, simulation: { kind: "event", id: "product-review" } })}
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
