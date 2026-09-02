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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
      <button
        type="button"
        onClick={onScrollToReviews}
        className="flex items-center gap-2"
      >
        <Stars value={average} />
        <strong>{average.toFixed(1)}</strong>
        <span className="text-sm text-muted-foreground">({total})</span>
      </button>
      {canRate ? (
        <button
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
