import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { superAdminUserService } from "@/features/super-admin/services/super-admin-user-service.server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

interface ImpersonateBody {
  targetUid: string;
}

export async function POST(request: Request) {
  return runTracedBusinessRoute("POST /api/super-admin/impersonate", async () => {
    try {
      const body = (await request.json()) as ImpersonateBody;
      const admin = assertSuperAdminRequest(request);
      if (!body.targetUid || body.targetUid === admin.uid) {
        throw new Error("invalidImpersonationTarget");
      }

      return apiSuccess(
        await superAdminUserService.impersonate({
          adminUid: admin.uid,
          targetUid: body.targetUid,
        }),
      );
    } catch (error) {
      return mapServiceError(error);
    }
  });
}
