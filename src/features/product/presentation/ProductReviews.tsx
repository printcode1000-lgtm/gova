"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronLeft, MessageSquare } from "lucide-react";
import { shouldUseUnoptimizedImage } from "@asol/storage-core";
import { useSessionRuntime } from "@/shared/session-runtime";
import type {
  ProductReview,
  ProductReviewsResult,
  ReviewSort,
} from "@/features/product";
import { productReviewApiService } from "@/features/product/application/services/product-review-api-service";
import { getProfileReviewsPort } from "../ports/profile-reviews.port";
import { usePageSaveOperationScope } from "@/features/page-save/ui";

import { PAGE_SIZE, emptyReviewsResult, Stars, relativeDate } from "./product-reviews/ProductReviews.review-formatting";
import {
  ProductReviewDialog,
  ProductReviewReplyDialog,
} from "./product-reviews/ProductReviewDialogs";
import { ProductReviewsSummary } from "./product-reviews/ProductReviewsSummary";

export function ProductReviews({ id,
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
} & { id?: string }) {
  const { session, isLoggedIn } = useSessionRuntime();
  const [result, setResult] = React.useState<ProductReviewsResult | null>(null);
  const [sort, setSort] = React.useState<ReviewSort>("newest");
  const [loading, setLoading] = React.useState(true);
  const [modal, setModal] = React.useState(false);
  const [editing, setEditing] = React.useState<ProductReview | null>(null);
  const [rating, setRating] = React.useState(0);
  const [comment, setComment] = React.useState("");
  const [reviewsPath] = React.useState(() =>
    typeof window === "undefined"
      ? "/"
      : `${window.location.pathname}${window.location.search}`,
  );
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
        setResult(emptyReviewsResult());
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
            : await getProfileReviewsPort().list(
                targetId,
                sort,
                offset,
                PAGE_SIZE,
                session?.uid ?? "",
              );
        setResult((current) =>
          append && current
            ? { ...next, reviews: [...current.reviews, ...next.reviews] }
            : next,
        );
      } catch (error) {
        console.warn("[ProductReviews] Failed to load public reviews.", {
          type,
          targetId,
          error,
        });
        setResult(emptyReviewsResult());
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

  const reviewOperations = usePageSaveOperationScope({
    id: `product-reviews:${type}:${productId ?? targetUid ?? "unknown"}`,
    label: type === "product" ? "تقييمات المنتج" : "تقييمات المتجر",
    returnPath: reviewsPath,
    enabled: isLoggedIn,
  });

  const stageReviewSave = (nextRating: number, nextComment: string) => {
    if (!session || nextRating < 1) {
      reviewOperations.unstage("review-save");
      return;
    }
    const editedId = editing?.id ?? null;
    reviewOperations.stage({
      itemId: "review-save",
      kind: "save",
      label: editedId ? "تعديل التقييم" : "إضافة تقييم",
      execute: async () => {
        if (type === "product") {
          if (editedId)
            await productReviewApiService.update({
              reviewId: editedId,
              uid: session.uid,
              rating: nextRating,
              comment: nextComment,
              styleMode: commentsEnabled ? "stars-comments" : "stars",
            });
          else
            await productReviewApiService.create({
              productId: productId!,
              uid: session.uid,
              rating: nextRating,
              comment: nextComment,
              styleMode: commentsEnabled ? "stars-comments" : "stars",
            });
        } else if (editedId)
          await getProfileReviewsPort().update({
            reviewId: editedId,
            uid: session.uid,
            rating: nextRating,
            comment: nextComment,
          });
        else
          await getProfileReviewsPort().create({
            targetUid: targetUid!,
            uid: session.uid,
            rating: nextRating,
            comment: nextComment,
          });
        setModal(false);
        await refresh();
      },
    });
  };

  const changeRating = (nextRating: number) => {
    setRating(nextRating);
    stageReviewSave(nextRating, comment);
  };

  const changeComment = (nextComment: string) => {
    setComment(nextComment);
    stageReviewSave(rating, nextComment);
  };

  const stageReviewDelete = (reviewId: string) => {
    if (!session) return;
    reviewOperations.stage({
      itemId: `review-delete:${reviewId}`,
      kind: "delete",
      label: "حذف التقييم",
      execute: async () => {
        if (type === "product")
          await productReviewApiService.delete(reviewId, session.uid);
        else await getProfileReviewsPort().delete(reviewId, session.uid);
        await refresh();
      },
    });
  };

  const changeReplyText = (nextText: string) => {
    setReplyText(nextText);
    if (!session || !replyReview || !nextText.trim()) {
      reviewOperations.unstage("reply-save");
      return;
    }
    const reviewId = replyReview.id;
    reviewOperations.stage({
      itemId: "reply-save",
      kind: "save",
      label: "رد البائع",
      execute: async () => {
        if (type === "product")
          await productReviewApiService.reply(reviewId, session.uid, nextText);
        else
          await getProfileReviewsPort().reply(reviewId, session.uid, nextText);
        setReplyReview(null);
        setReplyText("");
        await refresh();
      },
    });
  };

  const stageReplyDelete = (reviewId: string) => {
    if (!session) return;
    reviewOperations.stage({
      itemId: `reply-delete:${reviewId}`,
      kind: "delete",
      label: "حذف رد البائع",
      execute: async () => {
        if (type === "product")
          await productReviewApiService.deleteReply(reviewId, session.uid);
        else await getProfileReviewsPort().deleteReply(reviewId, session.uid);
        await refresh();
      },
    });
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
    <div id={id} className="min-w-0 space-y-5">
      <ProductReviewsSummary
        id={id ? `${id}.summary` : "summary"}
        average={average}
        total={total}
        canRate={canRate}
        onScrollToReviews={() =>
          sectionRef.current?.scrollIntoView({ behavior: "smooth" })
        }
        onRate={() => openReview(result?.currentUserReview ?? null)}
      />
      <section ref={sectionRef} className="min-w-0 space-y-4">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <h3 className="flex min-w-0 items-center gap-2 break-words text-xl font-bold">
            <MessageSquare className="h-5 w-5" />
            تقييمات العملاء
          </h3>
          {result?.hasMore ? (
            <button
              type="button"
              onClick={() => load(result.reviews.length, true)}
              className="flex max-w-full items-center gap-1 break-words text-sm font-semibold text-primary"
            >
              عرض الكل
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className="grid min-w-0 gap-5 rounded-2xl border bg-card p-5 md:grid-cols-2">
          <div className="min-w-0 border-b pb-5 text-center md:border-b-0 md:border-l md:pb-0">
            <strong className="text-5xl">{average.toFixed(1)}</strong>
            <Stars value={average} size="text-2xl" />
            <p className="mt-2 break-words text-sm text-muted-foreground">
              بناءً على {total} تقييم
            </p>
          </div>
          <div className="min-w-0 space-y-2">
            {(result?.distribution ?? []).map((item) => (
              <div
                key={item.rating}
                className="grid min-w-0 grid-cols-[52px_1fr_32px] items-center gap-2 text-sm"
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
            className="asol-control asol-field-surface border border-input px-3"
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
          <div className="min-w-0 space-y-3">
            {result?.reviews.map((review) => (
              <article
                key={review.id}
                className="min-w-0 rounded-2xl border bg-card p-4"
              >
                <div className="flex min-w-0 gap-3">
                  {review.reviewerAvatarUrl ? (
                    <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full">
                      <Image
                        src={review.reviewerAvatarUrl}
                        alt={review.reviewerName}
                        fill
                        sizes="44px"
                        className="object-cover"
                        unoptimized={shouldUseUnoptimizedImage(review.reviewerAvatarUrl)}
                      />
                    </span>
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                      {review.reviewerName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <strong className="min-w-0 break-words">{review.reviewerName}</strong>
                      {review.verifiedPurchase ? (
                        <span className="max-w-full break-words rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                          Verified Purchase
                        </span>
                      ) : null}
                    </div>
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <Stars value={review.rating} />
                      <span className="text-xs text-muted-foreground">
                        {relativeDate(review.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 break-words text-sm text-muted-foreground">
                      {productName}
                    </p>
                    {commentsEnabled && review.comment ? (
                      <p className="mt-3 whitespace-pre-wrap break-words">
                        {review.comment}
                      </p>
                    ) : null}
                    <div className="mt-3 flex min-w-0 flex-wrap gap-2 text-sm">
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
                              await getProfileReviewsPort().helpful(
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
                            onClick={() => stageReviewDelete(review.id)}
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
                      <div className="mt-3 min-w-0 rounded-xl bg-muted/50 p-3">
                        <strong className="break-words text-sm">رد البائع</strong>
                        <p className="mt-1 whitespace-pre-wrap break-words">{review.reply.text}</p>
                        {isSeller ? (
                          <button
                            type="button"
                            onClick={() => stageReplyDelete(review.id)}
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
        <ProductReviewDialog
          id={id ? `${id}.review-dialog` : "review-dialog"}
          comment={comment}
          commentsEnabled={commentsEnabled}
          editing={editing}
          rating={rating}
          onClose={() => setModal(false)}
          onCommentChange={changeComment}
          onRatingChange={changeRating}
        />
      ) : null}
      {replyReview ? (
        <ProductReviewReplyDialog
          id={id ? `${id}.reply-dialog` : "reply-dialog"}
          replyText={replyText}
          onClose={() => setReplyReview(null)}
          onReplyTextChange={changeReplyText}
        />
      ) : null}
    </div>
  );
}
