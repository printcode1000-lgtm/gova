import fs from "node:fs/promises";
import path from "node:path";

import { mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { resolveArtifactByName } from "@/modules/release-commands/services/build-job-artifacts.server";
import { assertGooglePlayConsoleAllowed } from "@/modules/google-play-console/domain/development-guard.server";
import { runTracedBusinessRoute } from "../../../../../auth/traced-route";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ name: string }> },
) {
  return runTracedBusinessRoute("GET /api/super-admin/build-jobs/[jobId]/artifacts/[name]", async () => {
    try {
      assertSuperAdminRequest(request);
      assertGooglePlayConsoleAllowed();
      const { name } = await context.params;
      const fullPath = await resolveArtifactByName(name);
      if (!fullPath) throw new Error("releaseArtifactNotFound");
      const bytes = await fs.readFile(fullPath);
      return new NextResponse(bytes, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${path.basename(fullPath)}"`,
        },
      });
    } catch (error) {
      return mapServiceError(error);
    }
  });
}
