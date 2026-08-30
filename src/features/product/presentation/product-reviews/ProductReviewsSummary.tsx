"use client";

import { Stars } from "./ProductReviews.review-formatting";
import { createOpaqueUiInstanceId, uiAttributes, type UiInstanceId } from "@asol/ui-registry-core";

export function ProductReviewsSummary({
  average,
  total,
  canRate,
  onScrollToReviews,
  onRate,
  id,
  instance,
}: {
  average: number;
  total: number;
  canRate: boolean;
  onScrollToReviews: () => void;
  onRate: () => void;
  instance?: UiInstanceId;
} & { id?: string }) {
  const resolvedInstance = id ? createOpaqueUiInstanceId("reviews-summary", id) : instance;
  return (
    <div {...uiAttributes({ uid: "product.product-reviews.product-reviews-summary.div.2-cU7fQU", id: "product.product-reviews.product-reviews-summary.div.2", instance: resolvedInstance })} id="product.product-reviews.product-reviews-summary.div" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
      <button {...uiAttributes({ uid: "product.product-reviews.product-reviews-summary.button.2-fYZK8U", id: "product.product-reviews.product-reviews-summary.button.2", instance: resolvedInstance })} id="product.product-reviews.product-reviews-summary.button"
        type="button"
        onClick={onScrollToReviews}
        className="flex items-center gap-2"
      >
        <Stars id="product.product-reviews.product-reviews-summary.stars" value={average} />
        <strong {...uiAttributes({ uid: "product.product-reviews.product-reviews-summary.strong-G7Yxlj", id: "product.product-reviews.product-reviews-summary.strong", instance: resolvedInstance })}>{average.toFixed(1)}</strong>
        <span {...uiAttributes({ uid: "product.product-reviews.product-reviews-summary.span.2-PH5SAa", id: "product.product-reviews.product-reviews-summary.span.2", instance: resolvedInstance })} id="product.product-reviews.product-reviews-summary.span" className="text-sm text-muted-foreground">({total})</span>
      </button>
      {canRate ? (
        <button {...uiAttributes({ uid: "product-review-GBBl45", id: "product-review", kind: "action", interaction: { type: "tap" }, simulation: { kind: "event", id: "product-review" }, instance: resolvedInstance })}
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
