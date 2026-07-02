import { apiError, apiSuccess } from "@/core/api/api-response";
import { productReviewService } from "@/features/product/services/product-review-service.server";
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { reviewId: string; uid: string };
    return apiSuccess(
      await productReviewService.helpful(body.reviewId, body.uid),
    );
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Internal Server Error",
      400,
    );
  }
}
