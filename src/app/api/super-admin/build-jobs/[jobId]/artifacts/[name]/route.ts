import { createReadStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";

import { mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { assertGooglePlayConsoleAllowed } from "@/modules/google-play-console/domain/development-guard.server";
import { resolveStoredArtifact } from "@/modules/release-commands/services/build-job-artifacts.server";
import { readBuildJobRecord } from "@/modules/release-commands/services/build-job-runner.server";
import { NextResponse } from "next/server";
import { runTracedBusinessRoute } from "../../../../../auth/traced-route";

export async function GET(request: Request, context: { params: Promise<{ jobId: string; name: string }> }) {
  return runTracedBusinessRoute("GET /api/super-admin/build-jobs/[jobId]/artifacts/[name]", async () => {
    try {
      assertSuperAdminRequest(request);
      assertGooglePlayConsoleAllowed();
      const { jobId, name } = await context.params;
      const resolved = await resolveStoredArtifact(await readBuildJobRecord(jobId), name);
      if (!resolved) throw new Error("releaseArtifactNotFound");
      const body = Readable.toWeb(createReadStream(resolved.fullPath)) as ReadableStream;
      return new NextResponse(body, { headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(resolved.descriptor.size),
        "Content-Disposition": `attachment; filename="${path.basename(resolved.fullPath).replace(/["\r\n]/g, "")}"`,
      } });
    } catch (error) { return mapServiceError(error); }
  });
}
