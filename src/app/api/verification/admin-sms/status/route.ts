import { apiSuccess, mapServiceError, readJsonBody } from "@/core/api/api-response";
import { runTracedBusinessRoute } from "@/core/api/traced-route";
import { verificationService, type VerificationAdminSmsStatusBody } from "@/features/verification/server";

export async function POST(request: Request) {
  return runTracedBusinessRoute("POST /api/verification/admin-sms/status", async () => {
    try {
      const body = (await readJsonBody<unknown>(request)) as VerificationAdminSmsStatusBody;
      return apiSuccess(await verificationService.recordAdminSmsStatus(body));
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
