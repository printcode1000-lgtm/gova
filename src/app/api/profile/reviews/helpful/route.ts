import { apiError, apiSuccess } from "@/core/api/api-response";
import { profileReviewService } from "@/features/profile/services/profile-review-service.server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { reviewId: string; uid: string };
    return apiSuccess(
      await profileReviewService.helpful(body.reviewId, body.uid),
    );
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Internal Server Error",
      400,
    );
  }
}
