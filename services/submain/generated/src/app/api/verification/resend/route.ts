import { apiSuccess, mapServiceError, readJsonBody } from "@/core/api/api-response";
import { runTracedBusinessRoute } from "@/core/api/traced-route";
import { verificationService, type VerificationResendBody } from "@/features/verification/server";

export async function POST(request: Request) {
  return runTracedBusinessRoute("POST /api/verification/resend", async () => {
    try {
      const body = (await readJsonBody<unknown>(request)) as VerificationResendBody;
      return apiSuccess(await verificationService.resend(body));
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
