import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { specialtyChatService } from "@/features/specialty-chat/services/specialty-chat-service.server";
import type { SpecialtyChatIdentity } from "@/features/specialty-chat/domain/types";
import { runTracedBusinessRoute } from "../../auth/traced-route";

export async function POST(request: Request) {
  return runTracedBusinessRoute("POST /api/specialty-chat/preference", async () => {
    try {
      const body = (await request.json()) as { identity: SpecialtyChatIdentity; enabled?: boolean };
      return apiSuccess(
        typeof body.enabled === "boolean"
          ? await specialtyChatService.setPreference(body.identity, body.enabled)
          : await specialtyChatService.getPreference(body.identity),
      );
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() { return new Response(null, { status: 204 }); }

