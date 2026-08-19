import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import type { SaveProfileSpecialtiesInput } from "@/features/profile/entities/profile-specialties.entity";
import { profileService } from "@/features/profile/services/profile-service.bootstrap.server";
import { runTracedBusinessRoute } from "../../auth/traced-route";

export async function GET(request: Request) {
  return runTracedBusinessRoute("GET /api/profile/specialties", async () => {
    try {
      const uid = new URL(request.url).searchParams.get("uid") ?? "";
      return apiSuccess(await profileService.getSpecialties(uid));
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function PUT(request: Request) {
  return runTracedBusinessRoute("PUT /api/profile/specialties", async () => {
    try {
      const body = (await request.json()) as SaveProfileSpecialtiesInput;
      return apiSuccess(await profileService.saveSpecialties(body));
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
