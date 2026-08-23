import { createReadStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";

import { mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/server";
import { assertGooglePlayConsoleAllowed } from "@/features/google-play-console/server";
import { resolveStoredArtifact } from "@asol/release-core/console-artifacts";
import { readBuildJobRecord } from "@/features/release-commands/server";
import { NextResponse } from "next/server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

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
