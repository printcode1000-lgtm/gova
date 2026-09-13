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
    <div id={id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
      <button
        id={id ? `${id}-summary-button-4r8n2k` : undefined}
        type="button"
        onClick={onScrollToReviews}
        className="flex items-center gap-2"
      >
        <Stars id={id ? `${id}-stars-7m1c5p` : undefined} value={average} />
        <strong id={id ? `${id}-average-2v6h9q` : undefined}>{average.toFixed(1)}</strong>
        <span id={id ? `${id}-count-5d3k8w` : undefined} className="text-sm text-muted-foreground">({total})</span>
      </button>
      {canRate ? (
        <button
          id={id ? `${id}-rate-button-9p4f1x` : undefined}
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
