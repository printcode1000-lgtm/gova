import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { profileService } from "@/features/profile/services/profile-service.bootstrap.server";
import { runTracedBusinessRoute } from "../../auth/traced-route";

export async function GET(request: Request) {
  return runTracedBusinessRoute("GET /api/profile/users-by-specialty", async () => {
    try {
      const url = new URL(request.url);
      const columnName = url.searchParams.get("columnName") ?? "";
      const offset = Number(url.searchParams.get("offset") ?? "0");
      const limit = Number(url.searchParams.get("limit") ?? "10");
      
      return apiSuccess(await profileService.getUsersBySpecialty(columnName, offset, limit));
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
