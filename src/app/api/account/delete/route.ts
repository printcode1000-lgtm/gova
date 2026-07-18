import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { accountDeletionService } from "@/features/account-deletion/services/account-deletion-service.server";
import type { DeleteAccountInput } from "@/features/account-deletion/types";

export async function POST(request: Request) {
  try { return apiSuccess(await accountDeletionService.delete((await request.json()) as DeleteAccountInput)); }
  catch (error) { return mapServiceError(error); }
}
export async function OPTIONS() { return new Response(null, { status: 204 }); }
