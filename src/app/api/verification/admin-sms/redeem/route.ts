import { apiSuccess, mapServiceError, readJsonBody } from "@/core/api/api-response";
import { runTracedBusinessRoute } from "@/core/api/traced-route";
import { verificationService, type VerificationAdminSmsRedeemBody } from "@/features/verification/server";

export async function POST(request: Request) {
  return runTracedBusinessRoute("POST /api/verification/admin-sms/redeem", async () => {
    try {
      const body = (await readJsonBody<unknown>(request)) as VerificationAdminSmsRedeemBody;
      return apiSuccess(await verificationService.redeemAdminSms(body));
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
