import type { ProductReview } from "@/features/product";

/**
 * Composition surfaces only. Persisting a review or a seller reply is staged
 * work owned by `@asol/page-save-core`, so neither dialog carries a save button.
 */
export function ProductReviewDialog({ id,
  comment,
  commentsEnabled,
  editing,
  rating,
  onClose,
  onCommentChange,
  onRatingChange,
}: {
  comment: string;
  commentsEnabled: boolean;
  editing: ProductReview | null;
  rating: number;
  onClose: () => void;
  onCommentChange: (value: string) => void;
  onRatingChange: (value: number) => void;
} & { id?: string }) {
  return (
    <div id={id} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div id="product-presentation-product-reviews-productreviewdialogs-div-2-liwqah"
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-background p-5 shadow-xl"
      >
        <h3 id="product-presentation-product-reviews-productreviewdialogs-heading-3-altjwf" className="text-xl font-bold">
          {editing ? "تعديل التقييم" : "تقييم"}
        </h3>
        <div id="product-presentation-product-reviews-productreviewdialogs-div-4-rw6ivx" className="my-5 flex justify-center gap-1" dir="ltr">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onRatingChange(star)}
              className={`text-3xl ${star <= rating ? "text-amber-500" : "text-gray-300"}`}
            >
              ★
            </button>
          ))}
        </div>
        {commentsEnabled ? (
          <textarea id="product-presentation-product-reviews-productreviewdialogs-textarea-5-ytyjue"
            value={comment}
            onChange={(event) => onCommentChange(event.target.value)}
            className="asol-control asol-field-surface min-h-28 w-full border border-input p-3"
            placeholder="اكتب مراجعتك"
          />
        ) : null}
        <div id="product-presentation-product-reviews-productreviewdialogs-div-6-yle8jm" className="mt-4 flex gap-2">
          <button id="product-presentation-product-reviews-productreviewdialogs-button-7-hj6s48"
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border px-4 py-2"
          >
            تم
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProductReviewReplyDialog({ id,
  replyText,
  onClose,
  onReplyTextChange,
}: {
  replyText: string;
  onClose: () => void;
  onReplyTextChange: (value: string) => void;
} & { id?: string }) {
  return (
    <div id={id} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div id="product-presentation-product-reviews-productreviewdialogs-div-9-arnuey"
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-background p-5"
      >
        <h3 id="product-presentation-product-reviews-productreviewdialogs-heading-10-yui1gc" className="text-xl font-bold">رد البائع</h3>
        <textarea id="product-presentation-product-reviews-productreviewdialogs-textarea-11-yroxcx"
          value={replyText}
          onChange={(event) => onReplyTextChange(event.target.value)}
          className="asol-control asol-field-surface mt-4 min-h-28 w-full border border-input p-3"
        />
        <div id="product-presentation-product-reviews-productreviewdialogs-div-12-ual9jq" className="mt-4 flex gap-2">
          <button id="product-presentation-product-reviews-productreviewdialogs-button-13-qkdsd5"
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border px-4 py-2"
          >
            تم
          </button>
        </div>
      </div>
    </div>
  );
}
