import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { superAdminUserService } from "@/features/super-admin/services/super-admin-user-service.server";
import { runTracedBusinessRoute } from "../../../auth/traced-route";

function positiveInt(value: string | null, fallback: number) {
  const next = Number(value);
  return Number.isInteger(next) && next >= 0 ? next : fallback;
}

export async function GET(request: Request) {
  return runTracedBusinessRoute("GET /api/super-admin/users/search", async () => {
    try {
      const { searchParams } = new URL(request.url);
      assertSuperAdminRequest(request);

      const results = await superAdminUserService.search({
        query: searchParams.get("q")?.trim() ?? "",
        specialty: searchParams.get("specialty")?.trim().toLowerCase() ?? "",
        minProducts: positiveInt(searchParams.get("minProducts"), 0),
        maxProducts: positiveInt(searchParams.get("maxProducts"), 0),
        withProductsOnly: searchParams.get("withProductsOnly") === "1",
        limit: Math.min(positiveInt(searchParams.get("limit"), 50), 200),
      });

      return apiSuccess({ results });
    } catch (error) {
      return mapServiceError(error);
    }
  });
}
