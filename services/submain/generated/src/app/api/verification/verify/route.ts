import { apiSuccess, mapServiceError, readJsonBody } from "@/core/api/api-response";
import { runTracedBusinessRoute } from "@/core/api/traced-route";
import { verificationService, type VerificationVerifyBody } from "@/features/verification/server";

export async function POST(request: Request) {
  return runTracedBusinessRoute("POST /api/verification/verify", async () => {
    try {
      const body = (await readJsonBody<unknown>(request)) as VerificationVerifyBody;
      return apiSuccess(await verificationService.verify(body));
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
