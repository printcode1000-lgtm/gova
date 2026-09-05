import { apiSuccess, mapServiceError, readJsonBody } from "@/core/api/api-response";
import { accountDeletionService } from "@/features/auth/server";
import type { DeleteAccountInput } from "@asol/auth-core";
import { extractSessionToken } from "@asol/auth-core/server";

export async function POST(request: Request) {
  try {
    const body = (await readJsonBody<unknown>(request)) as DeleteAccountInput;
    const sessionToken = extractSessionToken(request, body);
    return apiSuccess(
      await accountDeletionService.delete({
        uid: body.uid,
        currentPassword: body.currentPassword,
        confirmation: body.confirmation,
        sessionToken,
      }),
    );
  } catch (error) {
    return mapServiceError(error);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
