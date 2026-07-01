"use client";

import * as React from "react";
import { ProductComponentFrame } from "./shared";
import type { ProductPreviewComponentProps } from "./types";

export function ProductRating({
  mode,
  showComments,
}: ProductPreviewComponentProps & { showComments: boolean }) {
  const [rating, setRating] = React.useState(mode === "new" ? 0 : 4);
  const [comment, setComment] = React.useState(
    mode === "new" ? "" : "منتج ممتاز وجودته جيدة جدًا",
  );
  return (
    <ProductComponentFrame title="التقييم">
      <div className="flex gap-1" dir="ltr">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            disabled={mode === "view"}
            onClick={() => setRating(value)}
            className={`text-2xl ${value <= rating ? "text-amber-500" : "text-muted"}`}
          >
            ★
          </button>
        ))}
      </div>
      {showComments ? (
        mode === "view" ? (
          <p className="mt-3 rounded-xl bg-muted/40 p-3">{comment}</p>
        ) : (
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="اكتب تعليقًا"
            className="gova-control gova-field-surface mt-3 min-h-24 w-full border border-input p-3"
          />
        )
      ) : null}
    </ProductComponentFrame>
  );
}
