import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import type { SendFollowerNotificationInput } from "@/features/follow";
import { followService } from "@/features/follow/services/follow-service.bootstrap.server";
import { runTracedBusinessRoute } from "../../auth/traced-route";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return runTracedBusinessRoute("POST /api/follow/notifications", async () => {
    try {
      const sessionToken = request.headers.get("x-asol-session-token") ?? "";
      const body = (await request.json()) as SendFollowerNotificationInput;
      return apiSuccess(await followService.notifyFollowers(body, sessionToken));
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
