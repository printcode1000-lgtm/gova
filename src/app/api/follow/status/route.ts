import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { followService } from "@/features/follow/services/follow-service.bootstrap.server";
import type { FollowTargetType } from "@/features/follow";
import { runTracedBusinessRoute } from "../../auth/traced-route";

export async function GET(request: Request) {
  return runTracedBusinessRoute("GET /api/follow/status", async () => {
    try {
      const { searchParams } = new URL(request.url);
      const status = await followService.getStatus({
        targetType: searchParams.get("targetType") as FollowTargetType,
        targetId: searchParams.get("targetId") ?? "",
        viewerUid: searchParams.get("viewerUid") ?? undefined,
        targetOwnerUid: searchParams.get("targetOwnerUid") ?? undefined,
      });
      return apiSuccess(status);
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
