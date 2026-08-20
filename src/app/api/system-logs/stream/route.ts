import { createSseStream } from "@asol/system-logs-core/server";
import { verifySignedSessionToken } from "@asol/auth-core/server";
import { isSuperAdminIdentity } from "@/features/auth/utils/super-admin";
import { registerSystemLogsCoreServerPorts } from '@/core/config/system-logs.server';

registerSystemLogsCoreServerPorts();

function assertStreamAccess(request: Request) {
  const url = new URL(request.url);
  const token =
    request.headers.get("x-asol-session-token")?.trim() ??
    url.searchParams.get("sessionToken")?.trim() ??
    "";
  const claims = verifySignedSessionToken(token);
  if (!isSuperAdminIdentity(claims.uid, claims.phone)) {
    throw new Error("forbidden");
  }
}

export async function GET(request: Request) {
  try {
    assertStreamAccess(request);
    const since =
      new URL(request.url).searchParams.get("since") ??
      new Date(0).toISOString();
    const stream = createSseStream(since, request.signal);
    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "forbidden";
    return new Response(message, { status: message === "forbidden" ? 403 : 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
