import type { ProductReview } from "@/features/product";
import { createOpaqueUiInstanceId, uiAttributes, type UiInstanceId } from "@asol/ui-registry-core";

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
  instance,
}: {
  comment: string;
  commentsEnabled: boolean;
  editing: ProductReview | null;
  rating: number;
  onClose: () => void;
  onCommentChange: (value: string) => void;
  onRatingChange: (value: number) => void;
  instance?: UiInstanceId;
} & { id?: string }) {
  const resolvedInstance = id
    ? createOpaqueUiInstanceId("review-dialog", id)
    : (instance ?? createOpaqueUiInstanceId("review-dialog", editing ? "edit" : "create"));
  return (
    <div {...uiAttributes({ uid: "product.product-reviews.product-review-dialogs.div-N8RCNS", id: "product.product-reviews.product-review-dialogs.div", instance: resolvedInstance })} id={id} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div {...uiAttributes({ uid: "product.product-reviews.product-review-dialogs.div.2-KiN41h", id: "product.product-reviews.product-review-dialogs.div.2", instance: resolvedInstance })}
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-background p-5 shadow-xl"
      >
        <h3 {...uiAttributes({ uid: "product.product-reviews.product-review-dialogs.h3-l4E34g", id: "product.product-reviews.product-review-dialogs.h3", instance: resolvedInstance })} className="text-xl font-bold">
          {editing ? "تعديل التقييم" : "تقييم"}
        </h3>
        <div {...uiAttributes({ uid: "product.product-reviews.product-review-dialogs.div.3-0HUmAt", id: "product.product-reviews.product-review-dialogs.div.3", instance: resolvedInstance })} className="my-5 flex justify-center gap-1" dir="ltr">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star} {...uiAttributes({ uid: "product.product-reviews.product-review-dialogs.button-1Tq74F", id: "product.product-reviews.product-review-dialogs.button" , instance: createOpaqueUiInstanceId("iter-a4a90ec2c1", String(star))})}
              type="button"
              onClick={() => onRatingChange(star)}
              className={`text-3xl ${star <= rating ? "text-amber-500" : "text-gray-300"}`}
            >
              ★
            </button>
          ))}
        </div>
        {commentsEnabled ? (
          <textarea {...uiAttributes({ uid: "product.product-reviews.product-review-dialogs.textarea-jG34hN", id: "product.product-reviews.product-review-dialogs.textarea", instance: resolvedInstance })}
            value={comment}
            onChange={(event) => onCommentChange(event.target.value)}
            className="asol-control asol-field-surface min-h-28 w-full border border-input p-3"
            placeholder="اكتب مراجعتك"
          />
        ) : null}
        <div {...uiAttributes({ uid: "product.product-reviews.product-review-dialogs.div.4-XAZH7f", id: "product.product-reviews.product-review-dialogs.div.4", instance: resolvedInstance })} className="mt-4 flex gap-2">
          <button {...uiAttributes({ uid: "product.product-reviews.product-review-dialogs.button.2-eTM31A", id: "product.product-reviews.product-review-dialogs.button.2", instance: resolvedInstance })}
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
  instance,
}: {
  replyText: string;
  onClose: () => void;
  onReplyTextChange: (value: string) => void;
  instance?: UiInstanceId;
} & { id?: string }) {
  const resolvedInstance = id
    ? createOpaqueUiInstanceId("reply-dialog", id)
    : (instance ?? createOpaqueUiInstanceId("reply-dialog", "reply"));
  return (
    <div {...uiAttributes({ uid: "product.product-reviews.product-review-dialogs.div.5-z7ZyGV", id: "product.product-reviews.product-review-dialogs.div.5", instance: resolvedInstance })} id={id} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div {...uiAttributes({ uid: "product.product-reviews.product-review-dialogs.div.6-29tkI1", id: "product.product-reviews.product-review-dialogs.div.6", instance: resolvedInstance })}
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-background p-5"
      >
        <h3 {...uiAttributes({ uid: "product.product-reviews.product-review-dialogs.h3.2-V7XYVH", id: "product.product-reviews.product-review-dialogs.h3.2", instance: resolvedInstance })} className="text-xl font-bold">رد البائع</h3>
        <textarea {...uiAttributes({ uid: "product.product-reviews.product-review-dialogs.textarea.2-Rp8KfW", id: "product.product-reviews.product-review-dialogs.textarea.2", instance: resolvedInstance })}
          value={replyText}
          onChange={(event) => onReplyTextChange(event.target.value)}
          className="asol-control asol-field-surface mt-4 min-h-28 w-full border border-input p-3"
        />
        <div {...uiAttributes({ uid: "product.product-reviews.product-review-dialogs.div.7-KR9Vc1", id: "product.product-reviews.product-review-dialogs.div.7", instance: resolvedInstance })} className="mt-4 flex gap-2">
          <button {...uiAttributes({ uid: "product.product-reviews.product-review-dialogs.button.3-z9a8GE", id: "product.product-reviews.product-review-dialogs.button.3", instance: resolvedInstance })}
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
