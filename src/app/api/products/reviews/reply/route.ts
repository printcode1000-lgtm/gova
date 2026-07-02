import { apiError, apiSuccess } from "@/core/api/api-response";
import { productReviewService } from "@/features/product/services/product-review-service.server";
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      reviewId: string;
      uid: string;
      text: string;
    };
    return apiSuccess(
      await productReviewService.saveReply(body.reviewId, body.uid, body.text),
    );
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Internal Server Error",
      400,
    );
  }
}
export async function DELETE(request: Request) {
  try {
    const q = new URL(request.url).searchParams;
    await productReviewService.deleteReply(
      q.get("reviewId") ?? "",
      q.get("uid") ?? "",
    );
    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Internal Server Error",
      400,
    );
  }
}
