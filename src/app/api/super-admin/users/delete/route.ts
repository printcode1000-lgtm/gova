import "server-only";

import { runSuperAdminJsonRoute } from "@/features/super-admin/server";
import { superAdminUserService } from "@/features/super-admin/server";

interface DeleteUserBody {
  targetUid: string;
}

export const POST = (request: Request) =>
  runSuperAdminJsonRoute<DeleteUserBody, unknown>(
    "POST /api/super-admin/users/delete",
    request,
    async ({ admin, body }) => {
      return superAdminUserService.deleteUser({
        adminUid: admin.uid,
        targetUid: body.targetUid,
      });
    },
  );
