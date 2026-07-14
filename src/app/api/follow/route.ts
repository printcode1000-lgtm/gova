import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { followService } from "@/features/follow/services/follow-service.bootstrap.server";
import type { FollowMutationInput, FollowTargetType } from "@/features/follow";
import { runTracedBusinessRoute } from "../auth/traced-route";

export async function POST(request: Request) {
  return runTracedBusinessRoute("POST /api/follow", async () => {
    try {
      const body = (await request.json()) as FollowMutationInput;
      return apiSuccess(await followService.follow(body));
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function DELETE(request: Request) {
  return runTracedBusinessRoute("DELETE /api/follow", async () => {
    try {
      const { searchParams } = new URL(request.url);
      return apiSuccess(
        await followService.unfollow({
          viewerUid: searchParams.get("viewerUid") ?? "",
          targetType: searchParams.get("targetType") as FollowTargetType,
          targetId: searchParams.get("targetId") ?? "",
          targetOwnerUid: searchParams.get("targetOwnerUid") ?? undefined,
        }),
      );
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
