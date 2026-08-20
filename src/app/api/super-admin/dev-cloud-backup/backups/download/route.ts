import { NextResponse } from "next/server";

import { apiError, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { devCloudBackupService } from "@/modules/dev-cloud-backup/services/dev-cloud-backup-service.server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function GET(request: Request) {
  return runTracedBusinessRoute(
    "GET /api/super-admin/dev-cloud-backup/backups/download",
    async () => {
      try {
        assertSuperAdminRequest(request);
        const file = new URL(request.url).searchParams.get("file") ?? "";
        if (!file) return apiError("devCloudBackupFileRequired", 400);
        const backup = await devCloudBackupService.readBackup(file);
        return new NextResponse(new Uint8Array(backup.body), {
          headers: {
            "content-type": "application/zip",
            "content-disposition": `attachment; filename="${backup.fileName}"`,
          },
        });
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}
