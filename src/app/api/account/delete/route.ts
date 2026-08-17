import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { accountDeletionService } from "@/features/auth/server/auth-core-bootstrap.server";
import type { DeleteAccountInput } from "@asol/auth-core";
import { extractSessionToken } from "@asol/auth-core/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DeleteAccountInput;
    const sessionToken = extractSessionToken(request, body);
    return apiSuccess(
      await accountDeletionService.delete({ ...body, sessionToken }),
    );
  } catch (error) {
    return mapServiceError(error);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
