import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import type { StartProductConversationInput } from "@/features/specialty-chat/domain/types";
import { specialtyChatService } from "@/features/specialty-chat/services/specialty-chat-service.server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/specialty-chat/product-conversations",
    async () => {
      try {
        return apiSuccess(
          await specialtyChatService.startProductConversation(
            (await request.json()) as StartProductConversationInput,
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
