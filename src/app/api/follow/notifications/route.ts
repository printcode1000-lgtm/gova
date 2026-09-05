import { apiSuccess, mapServiceError, readJsonBody } from "@/core/api/api-response";
import type { SendFollowerNotificationInput } from "@/features/follow";
import { followService } from "@/features/follow/server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export const runtime = "nodejs";

export async function POST(request: Request) {
  return runTracedBusinessRoute("POST /api/follow/notifications", async () => {
    try {
      const sessionToken = request.headers.get("x-asol-session-token") ?? "";
      const body = (await readJsonBody<unknown>(request)) as SendFollowerNotificationInput;
      return apiSuccess(await followService.notifyFollowers(body, sessionToken));
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
