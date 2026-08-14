import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import type {
  SpecialtyChatIdentity,
  SpecialtyChatPreferenceChanges,
} from "@/features/specialty-chat/domain/types";
import { specialtyChatService } from "@/features/specialty-chat/services/specialty-chat-service.server";
import { runTracedBusinessRoute } from "../../auth/traced-route";

function preferenceChanges(value: unknown): SpecialtyChatPreferenceChanges {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  return {
    ...(typeof input.specialtyRequestsEnabled === "boolean"
      ? { specialtyRequestsEnabled: input.specialtyRequestsEnabled }
      : {}),
    ...(typeof input.productConversationsEnabled === "boolean"
      ? { productConversationsEnabled: input.productConversationsEnabled }
      : {}),
  };
}

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/specialty-chat/preferences",
    async () => {
      try {
        const body = (await request.json()) as {
          identity: SpecialtyChatIdentity;
          changes?: unknown;
        };
        return apiSuccess(
          body.changes === undefined
            ? await specialtyChatService.getPreferences(body.identity)
            : await specialtyChatService.setPreferences(
                body.identity,
                preferenceChanges(body.changes),
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
