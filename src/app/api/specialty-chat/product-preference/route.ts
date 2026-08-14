import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import type { SpecialtyChatIdentity } from "@/features/specialty-chat/domain/types";
import { specialtyChatService } from "@/features/specialty-chat/services/specialty-chat-service.server";
import { runTracedBusinessRoute } from "../../auth/traced-route";

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/specialty-chat/product-preference",
    async () => {
      try {
        const body = (await request.json()) as {
          identity: SpecialtyChatIdentity;
          enabled?: boolean;
        };
        return apiSuccess(
          typeof body.enabled === "boolean"
            ? await specialtyChatService.setProductConversationPreference(
                body.identity,
                body.enabled,
              )
            : await specialtyChatService.getProductConversationPreference(
                body.identity,
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
