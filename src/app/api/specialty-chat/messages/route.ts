import { apiSuccess, mapServiceError, readJsonBody } from "@/core/api/api-response";
import { specialtyChatService } from "@/features/specialty-chat/server";
import type { SendSpecialtyMessageInput } from "@/features/specialty-chat";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function POST(request: Request) {
  return runTracedBusinessRoute("POST /api/specialty-chat/messages", async () => {
    try {
      return apiSuccess(await specialtyChatService.sendMessage((await readJsonBody<unknown>(request)) as SendSpecialtyMessageInput));
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() { return new Response(null, { status: 204 }); }

