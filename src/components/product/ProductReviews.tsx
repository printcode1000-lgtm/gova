"use client";

import * as React from "react";
import { ChevronLeft, MessageSquare } from "lucide-react";
import { useSession } from "@/features/auth/components/SessionProvider";
import type {
  ProductReview,
  ProductReviewsResult,
  ReviewSort,
} from "@/features/product/entities/product-review.entity";
import { productReviewApiService } from "@/features/product/services/product-review-api-service";
import { profileApiService } from "@/features/profile/services/profile-api-service";

const PAGE_SIZE = 3;
function Stars({ value, size = "text-lg" }: { value: number; size?: string }) {
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
function relativeDate(value: string) {
  const days = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 86400000),
  );
  if (days === 0) return "اليوم";
  if (days === 1) return "منذ يوم";
  return `منذ ${days} أيام`;
}

export function ProductReviews({
  productId,
  targetUid,
  ownerUid,
  productName,
  reviewsEnabled,
  targetEnabled,
  commentsEnabled,
  type = "product",
}: {
  productId?: string;
  targetUid?: string;
  ownerUid: string;
  productName: string;
  reviewsEnabled: boolean;
  targetEnabled: boolean;
  commentsEnabled: boolean;
  type?: "product" | "profile";
}) {
  const { session, isLoggedIn } = useSession();
  const [result, setResult] = React.useState<ProductReviewsResult | null>(null);
  const [sort, setSort] = React.useState<ReviewSort>("newest");
  const [loading, setLoading] = React.useState(true);
  const [modal, setModal] = React.useState(false);
  const [editing, setEditing] = React.useState<ProductReview | null>(null);
  const [rating, setRating] = React.useState(0);
  const [comment, setComment] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [replyReview, setReplyReview] = React.useState<ProductReview | null>(
    null,
  );
  const [replyText, setReplyText] = React.useState("");
  const sectionRef = React.useRef<HTMLElement>(null);
  const isSeller = session?.uid === ownerUid;
  const load = React.useCallback(
    async (offset = 0, append = false) => {
      const targetId = type === "product" ? productId : targetUid;
      if (!targetId) {
        setResult({
          average: 0,
          total: 0,
          distribution: [5, 4, 3, 2, 1].map((r) => ({
            rating: r,
            count: 0,
            percentage: 0,
          })),
          reviews: [],
          offset: 0,
          limit: PAGE_SIZE,
          hasMore: false,
          currentUserReview: null,
        });
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const next =
          type === "product"
            ? await productReviewApiService.list(
                targetId,
                sort,
                offset,
                PAGE_SIZE,
                session?.uid ?? "",
              )
            : ((await profileApiService.listReviews(
                targetId,
                sort,
                offset,
                PAGE_SIZE,
                session?.uid ?? "",
              )) as any);
        setResult((current) =>
          append && current
            ? { ...next, reviews: [...current.reviews, ...next.reviews] }
            : next,
        );
      } finally {
        setLoading(false);
      }
    },
    [productId, targetUid, type, sort, session?.uid],
  );
  React.useEffect(() => {
    void load();
  }, [load]);
  const openReview = (review: ProductReview | null) => {
    setEditing(review);
    setRating(review?.rating ?? 0);
    setComment(review?.comment ?? "");
    setModal(true);
  };
  const refresh = () => load(0, false);
  const submit = async () => {
    if (!session || rating < 1) return;
    setBusy(true);
    try {
      if (type === "product") {
        if (editing)
          await productReviewApiService.update({
            reviewId: editing.id,
            uid: session.uid,
            rating,
            comment,
            styleMode: commentsEnabled ? "stars-comments" : "stars",
          });
        else
          await productReviewApiService.create({
            productId: productId!,
            uid: session.uid,
            rating,
            comment,
            styleMode: commentsEnabled ? "stars-comments" : "stars",
          });
      } else {
        if (editing)
          await profileApiService.updateReview({
            reviewId: editing.id,
            uid: session.uid,
            rating,
            comment,
          });
        else
          await profileApiService.createReview({
            targetUid: targetUid!,
            uid: session.uid,
            rating,
            comment,
          });
      }
      setModal(false);
      await refresh();
    } finally {
      setBusy(false);
    }
  };
  const remove = async (reviewId: string) => {
    if (!session || !window.confirm("حذف التقييم؟")) return;
    if (type === "product")
      await productReviewApiService.delete(reviewId, session.uid);
    else await profileApiService.deleteReview(reviewId, session.uid);
    await refresh();
  };
  const saveReply = async () => {
    if (!session || !replyReview) return;
    setBusy(true);
    try {
      if (type === "product")
        await productReviewApiService.reply(
          replyReview.id,
          session.uid,
          replyText,
        );
      else
        await profileApiService.replyReview(
          replyReview.id,
          session.uid,
          replyText,
        );
      setReplyReview(null);
      setReplyText("");
      await refresh();
    } finally {
      setBusy(false);
    }
  };
  const deleteReply = async (reviewId: string) => {
    if (!session || !window.confirm("حذف الرد؟")) return;
    if (type === "product")
      await productReviewApiService.deleteReply(reviewId, session.uid);
    else await profileApiService.deleteReplyReview(reviewId, session.uid);
    await refresh();
  };
  const targetId = type === "product" ? productId : targetUid;
  const canRate =
    Boolean(targetId) &&
    isLoggedIn &&
    !isSeller &&
    reviewsEnabled &&
    targetEnabled;
  const average = result?.average ?? 0,
    total = result?.total ?? 0;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
        <button
          type="button"
          onClick={() =>
            sectionRef.current?.scrollIntoView({ behavior: "smooth" })
          }
          className="flex items-center gap-2"
        >
          <Stars value={average} />
          <strong>{average.toFixed(1)}</strong>
          <span className="text-sm text-muted-foreground">({total})</span>
        </button>
        {canRate ? (
          <button
            type="button"
            onClick={() => openReview(result?.currentUserReview ?? null)}
            className="rounded-xl bg-primary px-4 py-2 font-semibold text-on-primary"
          >
            تقييم
          </button>
        ) : null}
      </div>
      <section ref={sectionRef} className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xl font-bold">
            <MessageSquare className="h-5 w-5" />
            تقييمات العملاء
          </h3>
          {result?.hasMore ? (
            <button
              type="button"
              onClick={() => load(result.reviews.length, true)}
              className="flex items-center gap-1 text-sm font-semibold text-primary"
            >
              عرض الكل
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className="grid gap-5 rounded-2xl border bg-card p-5 md:grid-cols-2">
          <div className="flex flex-col items-center justify-center border-b pb-5 md:border-b-0 md:border-l md:pb-0">
            <strong className="text-5xl">{average.toFixed(1)}</strong>
            <Stars value={average} size="text-2xl" />
            <p className="mt-2 text-sm text-muted-foreground">
              بناءً على {total} تقييم
            </p>
          </div>
          <div className="space-y-2">
            {(result?.distribution ?? []).map((item) => (
              <div
                key={item.rating}
                className="grid grid-cols-[52px_1fr_32px] items-center gap-2 text-sm"
              >
                <span>{item.rating} نجوم</span>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-amber-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <span>{item.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as ReviewSort)}
            className="gova-control gova-field-surface border border-input px-3"
          >
            <option value="newest">الأحدث أولًا</option>
            <option value="highest">الأعلى تقييمًا</option>
            <option value="lowest">الأدنى تقييمًا</option>
          </select>
        </div>
        {loading && !result ? (
          <p className="py-8 text-center">جارٍ التحميل…</p>
        ) : result?.reviews.length === 0 ? (
          <p className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">
            لا توجد مراجعات بعد.
          </p>
        ) : (
          <div className="space-y-3">
            {result?.reviews.map((review) => (
              <article
                key={review.id}
                className="rounded-2xl border bg-card p-4"
              >
                <div className="flex gap-3">
                  {review.reviewerAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={review.reviewerAvatarUrl}
                      alt={review.reviewerName}
                      className="h-11 w-11 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                      {review.reviewerName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong>{review.reviewerName}</strong>
                      {review.verifiedPurchase ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                          Verified Purchase
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Stars value={review.rating} />
                      <span className="text-xs text-muted-foreground">
                        {relativeDate(review.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {productName}
                    </p>
                    {commentsEnabled && review.comment ? (
                      <p className="mt-3 whitespace-pre-wrap">
                        {review.comment}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                      <button
                        type="button"
                        disabled={!isLoggedIn}
                        onClick={async () => {
                          if (session) {
                            if (type === "product")
                              await productReviewApiService.helpful(
                                review.id,
                                session.uid,
                              );
                            else
                              await profileApiService.helpfulReview(
                                review.id,
                                session.uid,
                              );
                            await refresh();
                          }
                        }}
                        className={
                          review.isHelpful
                            ? "font-semibold text-primary"
                            : "text-muted-foreground"
                        }
                      >
                        مفيد ({review.helpfulCount})
                      </button>
                      {session?.uid === review.uid ? (
                        <>
                          <button
                            type="button"
                            onClick={() => openReview(review)}
                            className="text-primary"
                          >
                            تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(review.id)}
                            className="text-destructive"
                          >
                            حذف
                          </button>
                        </>
                      ) : null}
                      {isSeller ? (
                        <button
                          type="button"
                          onClick={() => {
                            setReplyReview(review);
                            setReplyText(review.reply?.text ?? "");
                          }}
                          className="text-primary"
                        >
                          {review.reply ? "تعديل الرد" : "إضافة رد"}
                        </button>
                      ) : null}
                    </div>
                    {review.reply ? (
                      <div className="mt-3 rounded-xl bg-muted/50 p-3">
                        <strong className="text-sm">رد البائع</strong>
                        <p className="mt-1">{review.reply.text}</p>
                        {isSeller ? (
                          <button
                            type="button"
                            onClick={() => deleteReply(review.id)}
                            className="mt-2 text-sm text-destructive"
                          >
                            حذف الرد
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        {result?.hasMore ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => load(result.reviews.length, true)}
            className="w-full rounded-xl border px-4 py-3 font-semibold"
          >
            {loading ? "جارٍ التحميل…" : "تحميل المزيد"}
          </button>
        ) : null}
      </section>
      {modal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-background p-5 shadow-xl"
          >
            <h3 className="text-xl font-bold">
              {editing ? "تعديل التقييم" : "تقييم"}
            </h3>
            <div className="my-5 flex justify-center gap-1" dir="ltr">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`text-3xl ${star <= rating ? "text-amber-500" : "text-gray-300"}`}
                >
                  ★
                </button>
              ))}
            </div>
            {commentsEnabled ? (
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                className="gova-control gova-field-surface min-h-28 w-full border border-input p-3"
                placeholder="اكتب مراجعتك"
              />
            ) : null}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={busy || rating < 1}
                onClick={submit}
                className="flex-1 rounded-xl bg-primary px-4 py-2 text-on-primary"
              >
                {editing ? "حفظ" : "إرسال"}
              </button>
              <button
                type="button"
                onClick={() => setModal(false)}
                className="rounded-xl border px-4 py-2"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {replyReview ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-background p-5"
          >
            <h3 className="text-xl font-bold">رد البائع</h3>
            <textarea
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              className="gova-control gova-field-surface mt-4 min-h-28 w-full border border-input p-3"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={busy || !replyText.trim()}
                onClick={saveReply}
                className="flex-1 rounded-xl bg-primary px-4 py-2 text-on-primary"
              >
                حفظ
              </button>
              <button
                type="button"
                onClick={() => setReplyReview(null)}
                className="rounded-xl border px-4 py-2"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
