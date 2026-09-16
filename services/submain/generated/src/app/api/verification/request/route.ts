import { apiSuccess, mapServiceError, readJsonBody } from "@/core/api/api-response";
import { runTracedBusinessRoute } from "@/core/api/traced-route";
import { verificationService, type VerificationRequestBody } from "@/features/verification/server";

export async function POST(request: Request) {
  return runTracedBusinessRoute("POST /api/verification/request", async () => {
    try {
      const body = (await readJsonBody<unknown>(request)) as VerificationRequestBody;
      const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
      return apiSuccess(await verificationService.request(body, forwarded ?? "unknown"));
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
