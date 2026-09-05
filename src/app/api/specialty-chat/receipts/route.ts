import { apiSuccess, mapServiceError, readJsonBody } from "@/core/api/api-response";
import { specialtyChatService } from "@/features/specialty-chat/server";
import type { SendSpecialtyReceiptInput } from "@/features/specialty-chat";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function POST(request: Request) {
  return runTracedBusinessRoute("POST /api/specialty-chat/receipts", async () => {
    try {
      return apiSuccess(await specialtyChatService.sendReceipt((await readJsonBody<unknown>(request)) as SendSpecialtyReceiptInput));
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() { return new Response(null, { status: 204 }); }

