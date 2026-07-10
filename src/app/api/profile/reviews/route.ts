import { apiError, apiSuccess } from "@/core/api/api-response";
import type { ReviewSort } from "@/features/product/entities/product-review.entity";
import type {
  SaveProfileReviewInput,
  UpdateProfileReviewInput,
} from "@/features/profile/entities/profile-review.entity";
import { profileReviewService } from "@/features/profile/services/profile-review-service.server";

function failure(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Internal Server Error";
  const status =
    message.includes("NotFound") || message === "reviewNotFound"
      ? 404
      : message.includes("Forbidden") || message === "sellerCannotReview"
        ? 403
        : [
              "invalidReview",
              "reviewAlreadyExists",
              "reviewsDisabled",
              "userNotFound",
            ].includes(message)
          ? 400
          : 500;
  return apiError(message, status);
}

export async function GET(request: Request) {
  try {
    const q = new URL(request.url).searchParams;
    const sort = q.get("sort") as ReviewSort | null;
    return apiSuccess(
      await profileReviewService.list(
        q.get("targetUid") ?? "",
        sort === "highest" || sort === "lowest" ? sort : "newest",
        Number(q.get("offset") || 0),
        Number(q.get("limit") || 3),
        q.get("uid") ?? "",
      ),
    );
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    return apiSuccess(
      await profileReviewService.create(
        (await request.json()) as SaveProfileReviewInput,
      ),
      201,
    );
  } catch (error) {
    return failure(error);
  }
}

export async function PUT(request: Request) {
  try {
    return apiSuccess(
      await profileReviewService.update(
        (await request.json()) as UpdateProfileReviewInput,
      ),
    );
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const q = new URL(request.url).searchParams;
    await profileReviewService.delete(
      q.get("reviewId") ?? "",
      q.get("uid") ?? "",
    );
    return apiSuccess({ deleted: true });
  } catch (error) {
    return failure(error);
  }
}
