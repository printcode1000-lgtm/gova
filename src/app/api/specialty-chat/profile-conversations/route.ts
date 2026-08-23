import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import type { StartProfileConversationInput } from "@/features/specialty-chat";
import { specialtyChatService } from "@/features/specialty-chat/server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/specialty-chat/profile-conversations",
    async () => {
      try {
        return apiSuccess(
          await specialtyChatService.startProfileConversation(
            (await request.json()) as StartProfileConversationInput,
          ),
        );
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
