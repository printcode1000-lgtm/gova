import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { specialtyChatService } from "@/features/specialty-chat/services/specialty-chat-service.server";
import type { SendSpecialtyReceiptInput } from "@/features/specialty-chat/domain/types";
import { runTracedBusinessRoute } from "../../auth/traced-route";

export async function POST(request: Request) {
  return runTracedBusinessRoute("POST /api/specialty-chat/receipts", async () => {
    try {
      return apiSuccess(await specialtyChatService.sendReceipt((await request.json()) as SendSpecialtyReceiptInput));
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() { return new Response(null, { status: 204 }); }

