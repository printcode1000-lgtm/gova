import { apiError, apiSuccess } from "@/core/api/api-response";
import { profileReviewService } from "@/features/profile/services/profile-review-service.server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      reviewId: string;
      uid: string;
      text: string;
    };
    return apiSuccess(
      await profileReviewService.saveReply(body.reviewId, body.uid, body.text),
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
    await profileReviewService.deleteReply(
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
