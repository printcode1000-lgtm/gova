import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { specialtyChatService } from "@/features/specialty-chat/services/specialty-chat-service.server";
import type { SendSpecialtyRequestInput } from "@/features/specialty-chat/domain/types";
import { runTracedBusinessRoute } from "../../auth/traced-route";

export async function POST(request: Request) {
  return runTracedBusinessRoute("POST /api/specialty-chat/requests", async () => {
    try {
      return apiSuccess(await specialtyChatService.sendRequest((await request.json()) as SendSpecialtyRequestInput));
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() { return new Response(null, { status: 204 }); }

