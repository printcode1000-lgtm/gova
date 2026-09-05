import { apiSuccess, mapServiceError, readJsonBody } from "@/core/api/api-response";
import type { StartProductConversationInput } from "@/features/specialty-chat";
import { specialtyChatService } from "@/features/specialty-chat/server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/specialty-chat/product-conversations",
    async () => {
      try {
        return apiSuccess(
          await specialtyChatService.startProductConversation(
            (await readJsonBody<unknown>(request)) as StartProductConversationInput,
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
